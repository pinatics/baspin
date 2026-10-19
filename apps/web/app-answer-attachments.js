(() => {
  const fileInput = document.getElementById("answerFileInput");
  const listEl = document.getElementById("answerOwnAttachmentList");
  const startButton = document.getElementById("startAnswerVoiceBtn");
  const stopButton = document.getElementById("stopAnswerVoiceBtn");
  const timerEl = document.getElementById("answerVoiceTimer");
  const statusEl = document.getElementById("answerVoiceStatus");
  if (!fileInput || !listEl || !startButton || !stopButton) return;

  let draft = [];
  let mediaRecorder = null;
  let mediaStream = null;
  let chunks = [];
  let startedAt = 0;
  let timerHandle = null;
  let autoStopHandle = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.min(300, Math.floor(seconds || 0)));
    return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
  }

  function stopTimers() {
    if (timerHandle) clearInterval(timerHandle);
    if (autoStopHandle) clearTimeout(autoStopHandle);
    timerHandle = null;
    autoStopHandle = null;
  }

  function render() {
    listEl.innerHTML = draft.length ? draft.map((item, index) => {
      const preview = item.kind === "voice" && item.url
        ? `<audio controls src="${item.url}"></audio>`
        : item.kind === "image" && item.url
          ? `<img class="attachment-thumb" src="${item.url}" alt="${escapeHtml(item.name)}" />`
          : "";
      return `
        <div class="attachment-item">
          <div class="attachment-main">
            ${preview}
            <div>
              <strong>${escapeHtml(item.name)}</strong>
              <div class="card-meta">${escapeHtml(String(item.kind || "file").toUpperCase())}${item.durationSeconds ? ` · ${formatTime(item.durationSeconds)}` : ""}</div>
            </div>
          </div>
          <button class="link-btn answer-attachment-remove" type="button" data-index="${index}">Remove</button>
        </div>`;
    }).join("") : `<div class="card-meta">No answer attachments yet.</div>`;

    document.querySelectorAll(".answer-attachment-remove").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        const item = draft[index];
        if (item?.url) URL.revokeObjectURL(item.url);
        draft.splice(index, 1);
        render();
      });
    });
  }

  window.setAnswerAttachmentDraft = function setAnswerAttachmentDraft(items) {
    draft = Array.isArray(items) ? items.map(item => ({ ...item })) : [];
    render();
  };

  window.getAnswerAttachmentDraft = function getAnswerAttachmentDraft() {
    return draft.map(item => ({ ...item }));
  };

  window.clearAnswerAttachmentDraft = function clearAnswerAttachmentDraft() {
    draft = [];
    render();
  };

  fileInput.addEventListener("change", () => {
    Array.from(fileInput.files || []).forEach(file => {
      draft.push({
        id: `AATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind: file.type.startsWith("image/") ? "image" : "file",
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        addedAt: new Date().toISOString(),
        url: URL.createObjectURL(file),
      });
    });
    fileInput.value = "";
    render();
  });

  startButton.addEventListener("click", async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      statusEl.textContent = "Voice recording is not supported by this browser.";
      return;
    }
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.addEventListener("dataavailable", event => {
        if (event.data?.size) chunks.push(event.data);
      });
      mediaRecorder.addEventListener("stop", () => {
        stopTimers();
        const durationSeconds = Math.min(300, Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
        draft.push({
          id: `AATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          kind: "voice",
          name: `Voice message ${formatTime(durationSeconds)}`,
          mimeType: blob.type,
          size: blob.size,
          durationSeconds,
          addedAt: new Date().toISOString(),
          url: URL.createObjectURL(blob),
        });
        mediaStream?.getTracks().forEach(track => track.stop());
        mediaStream = null;
        mediaRecorder = null;
        startButton.disabled = false;
        stopButton.disabled = true;
        statusEl.textContent = durationSeconds >= 300 ? "5-minute limit reached. Recording saved." : "Voice message saved.";
        render();
      });
      mediaRecorder.start();
      startedAt = Date.now();
      startButton.disabled = true;
      stopButton.disabled = false;
      statusEl.textContent = "Recording…";
      timerHandle = setInterval(() => {
        const elapsed = Math.min(300, (Date.now() - startedAt) / 1000);
        timerEl.textContent = `${formatTime(elapsed)} / 05:00`;
      }, 250);
      autoStopHandle = setTimeout(() => {
        if (mediaRecorder?.state === "recording") mediaRecorder.stop();
      }, 300000);
    } catch (error) {
      statusEl.textContent = `Could not start microphone: ${error.message || error}`;
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
    }
  });

  stopButton.addEventListener("click", () => {
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  });

  render();
})();
