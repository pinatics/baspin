(() => {
  const panel = document.getElementById("questionAttachmentPanel");
  const panelTitle = document.getElementById("attachmentPanelTitle");
  const questionIndexInput = document.getElementById("attachmentQuestionIndex");
  const fileInput = document.getElementById("questionFileInput");
  const attachmentList = document.getElementById("questionAttachmentList");
  const closeButton = document.getElementById("closeAttachmentPanel");
  const startButton = document.getElementById("startVoiceBtn");
  const stopButton = document.getElementById("stopVoiceBtn");
  const timerEl = document.getElementById("voiceTimer");
  const statusEl = document.getElementById("voiceStatus");

  if (!panel || !fileInput || !attachmentList) return;

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
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureAttachments(question) {
    if (!Array.isArray(question.attachments)) question.attachments = [];
    return question.attachments;
  }

  function currentQuestion() {
    const index = Number(questionIndexInput.value);
    if (Number.isNaN(index)) return null;
    return state.questions[index] || null;
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.min(300, Math.floor(seconds)));
    const mm = String(Math.floor(value / 60)).padStart(2, "0");
    const ss = String(value % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function stopTimers() {
    if (timerHandle) clearInterval(timerHandle);
    if (autoStopHandle) clearTimeout(autoStopHandle);
    timerHandle = null;
    autoStopHandle = null;
  }

  function renderAttachmentList() {
    const question = currentQuestion();
    if (!question) {
      attachmentList.innerHTML = "";
      return;
    }
    const attachments = ensureAttachments(question);
    attachmentList.innerHTML = attachments.length ? attachments.map((item, index) => {
      const isVoice = item.kind === "voice";
      const preview = isVoice && item.url
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
              <div class="card-meta">${escapeHtml(item.kind.toUpperCase())}${item.durationSeconds ? ` · ${formatTime(item.durationSeconds)}` : ""}</div>
            </div>
          </div>
          <button class="link-btn attachment-delete-btn" type="button" data-index="${index}">Remove</button>
        </div>`;
    }).join("") : `<div class="card-meta">No attachments yet.</div>`;

    document.querySelectorAll(".attachment-delete-btn").forEach(button => {
      button.addEventListener("click", () => {
        const questionNow = currentQuestion();
        if (!questionNow) return;
        const list = ensureAttachments(questionNow);
        const index = Number(button.dataset.index);
        const item = list[index];
        if (item?.url) URL.revokeObjectURL(item.url);
        list.splice(index, 1);
        renderAttachmentList();
        if (window.renderQuestions) window.renderQuestions();
      });
    });
  }

  window.openQuestionAttachments = function openQuestionAttachments(index) {
    const question = state.questions[index];
    if (!question) return;
    ensureAttachments(question);
    questionIndexInput.value = String(index);
    panelTitle.textContent = `Attachments · ${question.department}`;
    panel.classList.remove("hidden");
    statusEl.textContent = "Microphone permission will be requested when recording starts.";
    timerEl.textContent = "00:00 / 05:00";
    renderAttachmentList();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  closeButton.addEventListener("click", () => {
    if (mediaRecorder?.state === "recording") mediaRecorder.stop();
    panel.classList.add("hidden");
  });

  fileInput.addEventListener("change", () => {
    const question = currentQuestion();
    if (!question) return;
    const attachments = ensureAttachments(question);
    Array.from(fileInput.files || []).forEach(file => {
      const kind = file.type.startsWith("image/") ? "image" : "file";
      attachments.push({
        id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        kind,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        addedAt: new Date().toISOString(),
        url: URL.createObjectURL(file),
      });
    });
    fileInput.value = "";
    renderAttachmentList();
    if (window.renderQuestions) window.renderQuestions();
  });

  startButton.addEventListener("click", async () => {
    const question = currentQuestion();
    if (!question) {
      statusEl.textContent = "Choose a question first.";
      return;
    }
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
        const attachments = ensureAttachments(question);
        attachments.push({
          id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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
        renderAttachmentList();
        if (window.renderQuestions) window.renderQuestions();
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
})();
