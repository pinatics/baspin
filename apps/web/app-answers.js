(() => {
  const config = window.BASPIN_CONFIG || {};
  const agentsBase = (config.agentsApiBaseUrl || "").replace(/\/$/, "");
  const form = document.getElementById("answerForm");
  const validateButton = document.getElementById("validateAnswersBtn");
  const questionList = document.getElementById("answerQuestionList");
  const answerTable = document.getElementById("answerTable");
  if (!form || !validateButton || !questionList || !answerTable) return;

  const questionIndexInput = document.getElementById("answerQuestionIndex");
  const formTitle = document.getElementById("answerFormTitle");
  const topicInput = document.getElementById("answerTopic");
  const valueInput = document.getElementById("answerValue");
  const sourceTypeInput = document.getElementById("answerSourceType");
  const sourceNameInput = document.getElementById("answerSourceName");
  const processStepInput = document.getElementById("answerProcessStep");
  const approvedInput = document.getElementById("answerApproved");
  const statusEl = document.getElementById("answerStatus");

  if (!Array.isArray(state.answers)) state.answers = [];
  if (!Array.isArray(state.validationFindings)) state.validationFindings = [];

  let editingAnswerIndex = null;

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentProjectId() {
    return state.currentProject?.id || "insurance-automated-claim-approval";
  }

  function answerForQuestion(questionIndex) {
    return state.answers.filter(answer => answer.questionIndex === questionIndex);
  }

  function defaultTopic(question, index) {
    if (question?.related) return slugify(question.related);
    if (question?.topic) return slugify(question.topic);
    return slugify(`${question?.department || "business"}_${question?.id || `question_${index + 1}`}`);
  }

  function selectQuestion(index, answerIndex = null) {
    const question = state.questions[index];
    if (!question) return;

    editingAnswerIndex = answerIndex;
    questionIndexInput.value = String(index);
    formTitle.textContent = `${question.department}: ${question.text}`;

    if (answerIndex !== null && state.answers[answerIndex]) {
      const answer = state.answers[answerIndex];
      topicInput.value = answer.topic || defaultTopic(question, index);
      valueInput.value = answer.value || "";
      sourceTypeInput.value = answer.sourceType || "stakeholder_answer";
      sourceNameInput.value = answer.sourceName || "";
      processStepInput.value = answer.processStep || "";
      approvedInput.checked = Boolean(answer.approved);
    } else {
      topicInput.value = defaultTopic(question, index);
      valueInput.value = "";
      sourceTypeInput.value = "stakeholder_answer";
      sourceNameInput.value = "";
      processStepInput.value = "";
      approvedInput.checked = false;
    }

    statusEl.textContent = answerIndex !== null ? "Editing saved answer record." : "Ready to collect an answer and evidence.";
    valueInput.focus();
  }

  function answerStatus(answer) {
    if (answer.validationStatus) return answer.validationStatus;
    return answer.approved ? "READY TO VALIDATE" : "UNCONFIRMED";
  }

  function statusClass(status) {
    const normalized = String(status || "").toUpperCase();
    if (normalized === "VALIDATED") return "approved";
    if (normalized === "BLOCKED") return "critical";
    if (normalized.includes("CLARIFICATION")) return "high";
    return "pending";
  }

  window.renderAnswers = function renderAnswers() {
    questionList.innerHTML = state.questions.length ? state.questions.map((question, index) => {
      const records = answerForQuestion(index);
      const answered = records.length > 0;
      const confirmed = records.some(record => record.approved);
      return `
        <button class="answer-question-card" type="button" data-question-index="${index}">
          <div class="answer-question-top">
            <strong>${escapeHtml(question.department || "Department")}</strong>
            <span class="status-pill ${confirmed ? "approved" : answered ? "high" : "pending"}">${confirmed ? "CONFIRMED" : answered ? "ANSWERED" : "OPEN"}</span>
          </div>
          <span>${escapeHtml(question.text)}</span>
          <small>${records.length} answer record${records.length === 1 ? "" : "s"}</small>
        </button>`;
    }).join("") : `<div class="mini-card"><div class="card-title">No questions yet</div><div class="card-meta">Create a project or add a BA question first.</div></div>`;

    document.querySelectorAll(".answer-question-card").forEach(button => {
      button.addEventListener("click", () => selectQuestion(Number(button.dataset.questionIndex)));
    });

    answerTable.innerHTML = state.answers.length ? state.answers.map((answer, index) => {
      const question = state.questions[answer.questionIndex] || {};
      const status = answerStatus(answer);
      return `
        <tr>
          <td>${escapeHtml(answer.department || question.department || "—")}</td>
          <td><code>${escapeHtml(answer.topic)}</code></td>
          <td>${escapeHtml(answer.value)}</td>
          <td>${escapeHtml(answer.sourceName || answer.sourceType || "—")}</td>
          <td>${answer.approved ? "Yes" : "No"}</td>
          <td><span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span></td>
          <td><button class="link-btn answer-edit-btn" type="button" data-answer-index="${index}">Edit</button></td>
        </tr>`;
    }).join("") : `<tr><td colspan="7">No answers or evidence collected yet.</td></tr>`;

    document.querySelectorAll(".answer-edit-btn").forEach(button => {
      button.addEventListener("click", () => {
        const answerIndex = Number(button.dataset.answerIndex);
        const answer = state.answers[answerIndex];
        if (answer) selectQuestion(answer.questionIndex, answerIndex);
      });
    });
  };

  function renderValidationFindings(response) {
    state.validationFindings = response.findings || [];
    const container = document.getElementById("conflictList");

    if (!state.validationFindings.length) {
      container.innerHTML = `
        <div class="conflict-card resolved">
          <div class="conflict-title"><div><div class="eyebrow">Validation complete</div><h2>No validation findings</h2></div><span class="status-pill approved">CLEAR</span></div>
          <p>No conflicts, unsupported claims, missing information, dependencies, or ambiguities were found in the supplied facts.</p>
        </div>`;
    } else {
      container.innerHTML = state.validationFindings.map(finding => `
        <div class="conflict-card ${finding.blocking ? "" : "resolved"}">
          <div class="conflict-title">
            <div><div class="eyebrow">${escapeHtml(finding.finding_type)}</div><h2>${escapeHtml(finding.topic)}</h2></div>
            <span class="status-pill ${finding.blocking ? "critical" : "high"}">${escapeHtml(finding.severity)}${finding.blocking ? " · BLOCKING" : ""}</span>
          </div>
          <p>${escapeHtml(finding.description)}</p>
          ${finding.clarification_question ? `<div class="conflict-source"><strong>Clarification:</strong> ${escapeHtml(finding.clarification_question)}</div>` : ""}
        </div>`).join("");
    }

    const validatedIds = new Set(response.validated_fact_ids || []);
    state.answers.forEach(answer => {
      const related = state.validationFindings.filter(finding => (finding.related_fact_ids || []).includes(answer.id));
      if (related.some(finding => finding.blocking)) answer.validationStatus = "BLOCKED";
      else if (related.length) answer.validationStatus = "NEEDS CLARIFICATION";
      else if (validatedIds.has(answer.id)) answer.validationStatus = "VALIDATED";
      else answer.validationStatus = answer.approved ? "REVIEW" : "UNCONFIRMED";
    });

    let addedClarifications = 0;
    state.validationFindings.forEach(finding => {
      if (!finding.clarification_question) return;
      const relatedKey = `validation:${finding.id}`;
      if (state.questions.some(question => question.related === relatedKey)) return;

      const relatedAnswer = state.answers.find(answer => (finding.related_fact_ids || []).includes(answer.id));
      const originalQuestion = relatedAnswer ? state.questions[relatedAnswer.questionIndex] : null;
      state.questions.push({
        id: `clarification-${finding.id}`,
        priority: finding.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        department: relatedAnswer?.department || originalQuestion?.department || "Business Analyst",
        text: finding.clarification_question,
        owner: finding.owner || relatedAnswer?.owner || originalQuestion?.owner || "Department Owner",
        type: "CLARIFICATION",
        related: relatedKey,
        source: "AI Generated",
        editedByBA: false,
      });
      addedClarifications += 1;
    });

    if (window.renderQuestions) window.renderQuestions();
    window.renderAnswers();

    const blockingCount = state.validationFindings.filter(finding => finding.blocking).length;
    const badge = document.getElementById("readinessBadge");
    badge.textContent = blockingCount ? "BLOCKED" : "VALIDATION";
    badge.className = `readiness-badge ${blockingCount ? "blocked" : "collecting"}`;

    const title = document.getElementById("readinessPanelTitle");
    const blockers = document.getElementById("blockers");
    title.textContent = blockingCount ? "Validation blockers" : "Validation in progress";
    blockers.innerHTML = blockingCount
      ? `<div class="blocker"><strong>${blockingCount} blocking validation finding${blockingCount === 1 ? "" : "s"}</strong><span>Resolve the clarification questions before requirements can be finalized.</span></div>`
      : `<div class="blocker neutral-blocker"><strong>No blocking conflicts found</strong><span>${state.validationFindings.length} non-blocking finding${state.validationFindings.length === 1 ? "" : "s"} remain for review. ${addedClarifications ? `${addedClarifications} clarification question${addedClarifications === 1 ? " was" : "s were"} added automatically.` : ""}</span></div>`;
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || `HTTP ${response.status}`);
    return payload;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    const questionIndex = Number(questionIndexInput.value);
    const question = state.questions[questionIndex];
    if (!question || Number.isNaN(questionIndex)) {
      statusEl.textContent = "Select a question first.";
      return;
    }

    const existingId = editingAnswerIndex !== null ? state.answers[editingAnswerIndex]?.id : null;
    const record = {
      id: existingId || `FACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      questionIndex,
      questionId: question.id || `question-${questionIndex + 1}`,
      topic: topicInput.value.trim(),
      value: valueInput.value.trim(),
      sourceType: sourceTypeInput.value,
      sourceName: sourceNameInput.value.trim(),
      department: question.department || "",
      owner: question.owner || "",
      approved: approvedInput.checked,
      processStep: processStepInput.value.trim(),
      validationStatus: null,
    };

    if (editingAnswerIndex !== null) state.answers[editingAnswerIndex] = record;
    else state.answers.push(record);

    editingAnswerIndex = null;
    statusEl.textContent = "Answer and evidence saved.";
    valueInput.value = "";
    sourceNameInput.value = "";
    approvedInput.checked = false;
    window.renderAnswers();
  });

  validateButton.addEventListener("click", async () => {
    if (!state.answers.length) {
      statusEl.textContent = "Add at least one answer before validation.";
      return;
    }

    validateButton.disabled = true;
    validateButton.textContent = "Validating…";
    statusEl.textContent = "Calling the live Baspin Validation Agent.";

    try {
      const response = await postJson(`${agentsBase}/validation/evaluate`, {
        project_id: currentProjectId(),
        facts: state.answers.map(answer => ({
          id: answer.id,
          topic: answer.topic,
          value: answer.value,
          source_type: answer.sourceType,
          source_name: answer.sourceName || null,
          department: answer.department || null,
          owner: answer.owner || null,
          approved: Boolean(answer.approved),
          process_step: answer.processStep || null,
        })),
        required_topics: [],
      });

      renderValidationFindings(response);
      statusEl.textContent = `${(response.findings || []).length} validation finding(s). ${(response.validated_fact_ids || []).length} approved fact(s) validated.`;
    } catch (error) {
      statusEl.textContent = `Validation failed: ${error.message || error}`;
    } finally {
      validateButton.disabled = false;
      validateButton.textContent = "Validate all answers";
    }
  });

  window.renderAnswers();
})();
