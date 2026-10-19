(() => {
  const addButton = document.getElementById("addQuestionBtn");
  const editor = document.getElementById("questionEditor");
  const cancelButton = document.getElementById("cancelQuestionEdit");
  const editIndex = document.getElementById("questionEditIndex");
  const departmentInput = document.getElementById("questionDepartment");
  const ownerInput = document.getElementById("questionOwner");
  const priorityInput = document.getElementById("questionPriority");
  const typeInput = document.getElementById("questionType");
  const textInput = document.getElementById("questionText");
  const relatedInput = document.getElementById("questionRelated");
  const questionTableBody = document.getElementById("questionTable");

  if (!addButton || !editor || !questionTableBody) return;

  const TWO_DAYS_MS = 48 * 60 * 60 * 1000;

  function ensureQuestionMetadata(question) {
    if (!question.id) question.id = `question-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    if (!question.type) question.type = "INITIAL";
    if (!question.source) question.source = "AI Generated";
    if (typeof question.editedByBA !== "boolean") question.editedByBA = false;
    if (!question.related) question.related = "";
    if (!Array.isArray(question.attachments)) question.attachments = [];
    if (!question.createdAt) question.createdAt = new Date().toISOString();
    if (!question.updatedAt) question.updatedAt = question.createdAt;
    if (!Array.isArray(question.auditEvents)) {
      question.auditEvents = [{ type: "QUESTION_CREATED", at: question.createdAt, actor: question.source || "Baspin" }];
    }
    return question;
  }

  state.questions = state.questions.map(ensureQuestionMetadata);

  const questionsSection = document.getElementById("questions");
  let diagramPanel = document.getElementById("questionProcessPanel");
  if (!diagramPanel && questionsSection) {
    diagramPanel = document.createElement("div");
    diagramPanel.id = "questionProcessPanel";
    diagramPanel.className = "panel question-process-panel hidden";
    const tablePanel = questionTableBody.closest(".table-panel");
    questionsSection.insertBefore(diagramPanel, tablePanel || null);
  }

  const table = questionTableBody.closest("table");
  const headerRow = table?.querySelector("thead tr");
  if (headerRow) {
    headerRow.innerHTML = "<th>Priority</th><th>Status</th><th>Department</th><th>Question</th><th>Owner</th><th>Type</th><th>Source</th><th>Attachments</th><th>Actions</th>";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function resetEditor() {
    editIndex.value = "";
    departmentInput.value = "";
    ownerInput.value = "";
    priorityInput.value = "MEDIUM";
    typeInput.value = "INITIAL";
    textInput.value = "";
    relatedInput.value = "";
  }

  function showEditor(question = null, index = null) {
    editor.classList.remove("hidden");
    if (question && index !== null) {
      editIndex.value = String(index);
      departmentInput.value = question.department || "";
      ownerInput.value = question.owner || "";
      priorityInput.value = question.priority || "MEDIUM";
      typeInput.value = question.type || "INITIAL";
      textInput.value = question.text || "";
      relatedInput.value = question.related || "";
    } else {
      resetEditor();
      if (state.departments?.length) {
        departmentInput.value = state.departments[0].name || "";
        ownerInput.value = state.departments[0].owner || "";
      }
    }
    textInput.focus();
  }

  function hideEditor() {
    editor.classList.add("hidden");
    resetEditor();
  }

  function answersForQuestion(index) {
    return (state.answers || []).filter(answer => answer.questionIndex === index || answer.questionId === state.questions[index]?.id);
  }

  function isLate(question, index) {
    if (answersForQuestion(index).length) return false;
    const created = Date.parse(question.createdAt || question.created_at || "");
    return Number.isFinite(created) && (Date.now() - created) > TWO_DAYS_MS;
  }

  function relatedFindings(answers) {
    const factIds = new Set(answers.map(answer => answer.id));
    return (state.validationFindings || []).filter(finding =>
      (finding.related_fact_ids || []).some(id => factIds.has(id))
    );
  }

  function questionStatus(question, index) {
    const answers = answersForQuestion(index);
    const findings = relatedFindings(answers);
    if (findings.some(finding => finding.blocking || finding.finding_type === "CONFLICT")) return "CONFLICT";
    if (answers.length && answers.some(answer => answer.validationStatus === "VALIDATED")) return "VALIDATED";
    if (answers.length) return "ANSWERED";
    if (isLate(question, index)) return "LATE";
    return "OPEN";
  }

  function statusClass(status) {
    if (status === "VALIDATED") return "approved";
    if (status === "CONFLICT") return "critical";
    if (status === "LATE") return "late";
    if (status === "ANSWERED") return "high";
    return "pending";
  }

  function matchingRequirements(answers) {
    const ids = new Set(answers.map(answer => answer.id));
    return (state.requirements || []).filter(req => (req.source_fact_ids || []).some(id => ids.has(id)));
  }

  function approvalForRequirements(requirements) {
    const ids = new Set(requirements.map(req => req.id));
    return [...(state.departmentApprovals || [])]
      .reverse()
      .find(item => ids.has(item.requirementId) && item.active !== false);
  }

  function stepState(kind, context) {
    const { answers, findings, requirements, approval } = context;
    if (kind === "question") return { state: "done", label: "Created" };
    if (kind === "answer") return answers.length ? { state: "done", label: "Received" } : { state: "waiting", label: "Waiting" };
    if (kind === "validation") {
      if (!answers.length) return { state: "locked", label: "Not started" };
      if (findings.some(f => f.blocking || f.finding_type === "CONFLICT")) return { state: "blocked", label: "Blocked" };
      if (answers.some(a => a.validationStatus === "VALIDATED")) return { state: "done", label: "Validated" };
      return { state: "waiting", label: "In review" };
    }
    if (kind === "resolution") {
      if (!answers.length) return { state: "locked", label: "Not started" };
      if (findings.some(f => f.blocking || f.finding_type === "CONFLICT")) return { state: "blocked", label: "Conflict open" };
      const hadPriorProblem = (state.validationHistory || []).some(round => (round.findings || []).some(f =>
        (f.related_fact_ids || []).some(id => answers.some(a => a.id === id))
      ));
      return hadPriorProblem ? { state: "done", label: "Resolved" } : { state: "done", label: "Clear" };
    }
    if (kind === "requirement") {
      if (requirements.length) return { state: "done", label: `${requirements.length} created` };
      if (answers.some(a => a.validationStatus === "VALIDATED")) return { state: "waiting", label: "Pending normalization" };
      return { state: "locked", label: "Not started" };
    }
    if (kind === "department") {
      if (!requirements.length) return { state: "locked", label: "Not started" };
      if (approval?.stale) return { state: "waiting", label: "Re-approval required" };
      if (approval?.packageStatus === "APPROVED") return { state: "done", label: "Approved" };
      if (approval?.packageStatus === "REJECTED") return { state: "blocked", label: "Rejected" };
      if (approval?.packageStatus === "NEEDS_CLARIFICATION") return { state: "waiting", label: "Needs clarification" };
      return { state: "waiting", label: "Pending approval" };
    }
    if (kind === "final") {
      const finalApproval = state.finalApproval || state.finalApprovalRecord || null;
      if (finalApproval?.decision === "APPROVED" || finalApproval?.status === "APPROVED") return { state: "done", label: "Approved" };
      if (!approval || approval.packageStatus !== "APPROVED") return { state: "locked", label: "Locked" };
      return { state: "waiting", label: "Pending" };
    }
    return { state: "locked", label: "Not started" };
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  }

  function openDiagram(index) {
    const question = state.questions[index];
    if (!question || !diagramPanel) return;
    const answers = answersForQuestion(index);
    const findings = relatedFindings(answers);
    const requirements = matchingRequirements(answers);
    const approval = approvalForRequirements(requirements);
    const status = questionStatus(question, index);
    const steps = [
      ["question", "Question"],
      ["answer", "Answer"],
      ["validation", "AI Validation"],
      ["resolution", "Conflict / Resolution"],
      ["requirement", "Requirement"],
      ["department", "Department Approval"],
      ["final", "Final Approval"],
    ].map(([kind, title]) => ({ kind, title, ...stepState(kind, { answers, findings, requirements, approval }) }));

    const lastAnswerAt = answers.length ? answers.map(a => a.updatedAt || a.createdAt).filter(Boolean).sort().at(-1) : null;

    diagramPanel.innerHTML = `
      <div class="panel-header">
        <div>
          <div class="eyebrow">Question process diagram</div>
          <h2>${escapeHtml(question.department)} · ${escapeHtml(question.text)}</h2>
        </div>
        <button class="secondary-btn" id="closeQuestionDiagram" type="button">Close</button>
      </div>
      <div class="question-diagram-summary">
        <span class="status-pill ${statusClass(status)}">${status}</span>
        <span>Owner: <strong>${escapeHtml(question.owner || "—")}</strong></span>
        <span>Created: ${escapeHtml(formatDate(question.createdAt))}</span>
        <span>Last answer: ${escapeHtml(lastAnswerAt ? formatDate(lastAnswerAt) : "No answer yet")}</span>
        ${status === "LATE" ? `<span class="late-note">More than 48 hours without a response</span>` : ""}
      </div>
      <div class="question-process-flow">
        ${steps.map((step, stepIndex) => `
          <div class="question-process-step ${step.state}">
            <div class="process-step-icon">${step.state === "done" ? "✓" : step.state === "blocked" ? "!" : stepIndex + 1}</div>
            <div class="process-step-title">${escapeHtml(step.title)}</div>
            <div class="process-step-label">${escapeHtml(step.label)}</div>
          </div>${stepIndex < steps.length - 1 ? `<div class="process-arrow">→</div>` : ""}`
        ).join("")}
      </div>
      <div class="question-diagram-legend">
        <span><i class="legend-dot done"></i> Completed / approved</span>
        <span><i class="legend-dot waiting"></i> Pending / waiting</span>
        <span><i class="legend-dot blocked"></i> Conflict / blocked / rejected</span>
        <span><i class="legend-dot locked"></i> Not started / locked</span>
      </div>`;

    diagramPanel.classList.remove("hidden");
    document.getElementById("closeQuestionDiagram")?.addEventListener("click", () => diagramPanel.classList.add("hidden"));
    diagramPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.renderQuestions = function renderQuestionsEditable() {
    state.questions = state.questions.map(ensureQuestionMetadata);
    questionTableBody.innerHTML = state.questions.map((q, index) => {
      const sourceLabel = q.source === "BA Added" ? "BA Added" : (q.editedByBA ? "AI Generated · edited by BA" : (q.source || "AI Generated"));
      const attachmentCount = q.attachments?.length || 0;
      const status = questionStatus(q, index);
      return `
        <tr class="${status === "LATE" ? "question-row-late" : ""}">
          <td><span class="status-pill ${q.priority === "CRITICAL" ? "critical" : q.priority === "HIGH" ? "high" : "pending"}">${escapeHtml(q.priority)}</span></td>
          <td><span class="status-pill ${statusClass(status)}">${status}</span></td>
          <td>${escapeHtml(q.department || "—")}</td>
          <td>${escapeHtml(q.text)}</td>
          <td>${escapeHtml(q.owner || "—")}</td>
          <td>${escapeHtml(q.type || "INITIAL")}</td>
          <td><span class="source-pill ${q.source === "BA Added" ? "ba" : "ai"}">${escapeHtml(sourceLabel)}</span></td>
          <td><span class="attachment-count">${attachmentCount} attachment${attachmentCount === 1 ? "" : "s"}</span></td>
          <td><div class="row-actions"><button class="link-btn question-edit-btn" type="button" data-index="${index}">Edit</button><button class="link-btn question-attach-btn" type="button" data-index="${index}">Attach</button><button class="link-btn question-diagram-btn" type="button" data-index="${index}">Diagram</button></div></td>
        </tr>`;
    }).join("");

    document.querySelectorAll(".question-edit-btn").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        showEditor(state.questions[index], index);
      });
    });

    document.querySelectorAll(".question-attach-btn").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        if (window.openQuestionAttachments) window.openQuestionAttachments(index);
      });
    });

    document.querySelectorAll(".question-diagram-btn").forEach(button => {
      button.addEventListener("click", () => openDiagram(Number(button.dataset.index)));
    });
  };

  addButton.addEventListener("click", () => showEditor());
  cancelButton.addEventListener("click", hideEditor);

  editor.addEventListener("submit", event => {
    event.preventDefault();
    const indexValue = editIndex.value;
    const existing = indexValue !== "" ? state.questions[Number(indexValue)] : null;
    const now = new Date().toISOString();

    const updatedQuestion = ensureQuestionMetadata({
      ...(existing || {}),
      priority: priorityInput.value,
      department: departmentInput.value.trim(),
      text: textInput.value.trim(),
      owner: ownerInput.value.trim(),
      type: typeInput.value,
      related: relatedInput.value.trim(),
      source: existing?.source || "BA Added",
      editedByBA: existing ? true : false,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    });
    updatedQuestion.auditEvents.push({ type: existing ? "QUESTION_EDITED" : "QUESTION_CREATED", at: now, actor: "Business Analyst" });

    if (indexValue === "") state.questions.push(updatedQuestion);
    else state.questions[Number(indexValue)] = updatedQuestion;

    renderQuestions();
    if (window.renderAnswers) window.renderAnswers();
    hideEditor();
  });

  window.getQuestionStatus = questionStatus;
  window.openQuestionProcessDiagram = openDiagram;

  renderQuestions();
})();
