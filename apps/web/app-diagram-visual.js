(() => {
  const questionsSection = document.getElementById("questions");
  if (!questionsSection) return;

  function ensureDetailPage() {
    const nav = document.querySelector(".nav");
    let navButton = document.querySelector('.nav-item[data-section="question-detail"]');
    if (!navButton && nav) {
      navButton = document.createElement("button");
      navButton.className = "nav-item";
      navButton.dataset.section = "question-detail";
      navButton.textContent = "Question Detail";
      const okfButton = nav.querySelector('.nav-item[data-section="okf"]');
      if (okfButton?.nextSibling) nav.insertBefore(navButton, okfButton.nextSibling);
      else nav.appendChild(navButton);
    }

    let detailSection = document.getElementById("question-detail");
    if (!detailSection) {
      detailSection = document.createElement("section");
      detailSection.id = "question-detail";
      detailSection.className = "page-section";
      detailSection.innerHTML = '<div class="section-heading"><div><div class="eyebrow">Question Governance</div><h2>Question Detail</h2></div></div>';
      document.querySelector(".main-content")?.appendChild(detailSection);
    }

    let panel = document.getElementById("questionProcessPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "questionProcessPanel";
      panel.className = "panel question-process-panel hidden";
    }
    if (panel.parentElement !== detailSection) detailSection.appendChild(panel);

    const activate = () => {
      document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".page-section").forEach(section => section.classList.remove("active"));
      navButton?.classList.add("active");
      detailSection.classList.add("active");
    };

    navButton?.addEventListener("click", activate);
    return { detailSection, panel, activate };
  }

  const detailPage = ensureDetailPage();

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function answersFor(index) {
    const question = state.questions?.[index];
    return (state.answers || []).filter(a => a.questionIndex === index || a.questionId === question?.id);
  }

  function findingsFor(answers) {
    const ids = new Set(answers.map(a => a.id));
    return (state.validationFindings || []).filter(f =>
      (f.related_fact_ids || []).some(id => ids.has(id))
    );
  }

  function requirementsFor(answers) {
    const ids = new Set(answers.map(a => a.id));
    return (state.requirements || []).filter(r =>
      (r.source_fact_ids || []).some(id => ids.has(id))
    );
  }

  function approvalFor(requirements) {
    const ids = new Set(requirements.map(r => r.id));
    return [...(state.departmentApprovals || [])].reverse()
      .find(a => ids.has(a.requirementId) && a.active !== false);
  }

  function statusFor(question, index) {
    if (window.getQuestionStatus) return window.getQuestionStatus(question, index);
    const answers = answersFor(index);
    if (!answers.length) return "OPEN";
    if (answers.some(a => a.validationStatus === "VALIDATED")) return "VALIDATED";
    return "ANSWERED";
  }

  function dateText(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
  }

  function node(title, subtitle, stateName, icon) {
    return `
      <div class="visual-node ${stateName}">
        <div class="visual-node-icon">${icon}</div>
        <div class="visual-node-title">${esc(title)}</div>
        <div class="visual-node-subtitle">${esc(subtitle)}</div>
      </div>`;
  }

  function attachmentIcon(item) {
    if (item?.kind === "voice" || item?.type === "voice") return "Voice";
    if (item?.kind === "image" || item?.type?.startsWith?.("image")) return "Image";
    return "File";
  }

  function renderAttachments(items = []) {
    if (!items.length) return `<div class="detail-empty">No attachments.</div>`;
    return `<div class="detail-attachment-grid">${items.map(item => `
      <div class="detail-attachment-card">
        <div class="detail-attachment-type">${esc(attachmentIcon(item))}</div>
        <div>
          <strong>${esc(item.name || item.filename || "Attachment")}</strong>
          <div class="detail-muted">${esc(item.duration ? `${item.duration}s` : item.mimeType || item.type || "Evidence attachment")}</div>
        </div>
      </div>`).join("")}</div>`;
  }

  function renderAnswers(answers) {
    if (!answers.length) return `<div class="detail-empty">No answer has been received yet.</div>`;
    return `<div class="detail-answer-list">${answers.map((answer, i) => `
      <article class="detail-answer-card">
        <div class="detail-answer-top">
          <div><div class="detail-kicker">Answer ${i + 1}</div><strong>${esc(answer.department || "Department")}</strong></div>
          <span class="status-pill ${answer.validationStatus === "VALIDATED" ? "approved" : "critical"}">${esc(answer.validationStatus || "COLLECTED")}</span>
        </div>
        <div class="detail-answer-text">${esc(answer.value || "")}</div>
        <div class="detail-meta-line">
          <span>Topic: ${esc(answer.topic || "—")}</span>
          <span>Source: ${esc(answer.sourceName || answer.sourceType || "—")}</span>
          <span>Owner confirmed: ${answer.approved ? "Yes" : "No"}</span>
        </div>
        ${renderAttachments(answer.attachments || [])}
      </article>`).join("")}</div>`;
  }

  function buildHistory(question, answers, findings, requirements, approval) {
    const events = [];
    (question.auditEvents || []).forEach(event => events.push({ at: event.at, title: event.type?.replaceAll?.("_", " ") || "Question event", detail: event.actor || "" }));
    answers.forEach(answer => events.push({ at: answer.createdAt || answer.updatedAt, title: "Answer received", detail: answer.department || answer.owner || "Department response" }));
    findings.forEach(finding => events.push({ at: finding.created_at || null, title: finding.finding_type || "Validation finding", detail: finding.message || finding.description || "Validation issue" }));
    requirements.forEach(req => events.push({ at: null, title: "Requirement created", detail: `${req.id} · v${req.version || 1}` }));
    if (approval) events.push({ at: approval.approval?.created_at || null, title: `Department ${approval.packageStatus || "review"}`, detail: approval.approval?.approver || "Department reviewer" });
    return events.sort((a, b) => {
      const ta = a.at ? Date.parse(a.at) : Number.MAX_SAFE_INTEGER;
      const tb = b.at ? Date.parse(b.at) : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });
  }

  function render(index) {
    const question = state.questions?.[index];
    const target = detailPage.panel;
    if (!question || !target) return;

    const answers = answersFor(index);
    const findings = findingsFor(answers);
    const requirements = requirementsFor(answers);
    const approval = approvalFor(requirements);
    const status = statusFor(question, index);

    const hasAnswer = answers.length > 0;
    const blocking = findings.some(f => f.blocking || f.finding_type === "CONFLICT");
    const validated = answers.some(a => a.validationStatus === "VALIDATED");
    const hadPriorIssue = (state.validationHistory || []).some(round =>
      (round.findings || []).some(f => (f.related_fact_ids || []).some(id => answers.some(a => a.id === id)))
    );
    const hasRequirement = requirements.length > 0;
    const deptApproved = approval?.packageStatus === "APPROVED" && !approval?.stale;
    const deptRejected = approval?.packageStatus === "REJECTED";
    const deptClarify = approval?.packageStatus === "NEEDS_CLARIFICATION" || approval?.stale;
    const finalApproval = state.finalApproval || state.finalApprovalRecord || null;
    const finalApproved = finalApproval?.decision === "APPROVED" || finalApproval?.status === "APPROVED";

    const answerState = hasAnswer ? "done" : (status === "LATE" ? "blocked" : "waiting");
    const validationState = !hasAnswer ? "locked" : blocking ? "blocked" : validated ? "done" : "waiting";
    const clearBranchState = blocking ? "locked" : validated ? "done" : "waiting";
    const conflictBranchState = blocking ? "blocked" : hadPriorIssue ? "done" : "locked";
    const requirementState = hasRequirement ? "done" : validated ? "waiting" : "locked";
    const deptState = deptApproved ? "done" : deptRejected ? "blocked" : deptClarify ? "waiting" : hasRequirement ? "waiting" : "locked";
    const finalState = finalApproved ? "done" : deptApproved ? "waiting" : "locked";
    const lastAnswer = answers.map(a => a.updatedAt || a.createdAt).filter(Boolean).sort().at(-1);
    const history = buildHistory(question, answers, findings, requirements, approval);

    target.innerHTML = `
      <div class="panel-header visual-diagram-header">
        <div><div class="eyebrow">Question detail</div><h2>${esc(question.text)}</h2></div>
        <button class="secondary-btn" id="closeQuestionDiagramVisual" type="button">Back to Questions</button>
      </div>

      <section class="question-detail-section">
        <div class="detail-section-title">Question Summary</div>
        <div class="question-summary-grid">
          <div class="summary-card"><span>Status</span><strong class="summary-status ${status.toLowerCase()}">${esc(status)}</strong></div>
          <div class="summary-card"><span>Department</span><strong>${esc(question.department || "—")}</strong></div>
          <div class="summary-card"><span>Owner</span><strong>${esc(question.owner || "—")}</strong></div>
          <div class="summary-card"><span>Priority</span><strong>${esc(question.priority || "—")}</strong></div>
          <div class="summary-card"><span>Type</span><strong>${esc(question.type || "INITIAL")}</strong></div>
          <div class="summary-card"><span>Source</span><strong>${esc(question.source || "AI Generated")}</strong></div>
          <div class="summary-card"><span>Created</span><strong>${esc(dateText(question.createdAt))}</strong></div>
          <div class="summary-card"><span>Last response</span><strong>${esc(lastAnswer ? dateText(lastAnswer) : "No response")}</strong></div>
          <div class="summary-card"><span>Attachments</span><strong>${(question.attachments || []).length}</strong></div>
          <div class="summary-card"><span>Answers</span><strong>${answers.length}</strong></div>
        </div>
        ${status === "LATE" ? `<div class="late-banner">LATE · More than 48 hours without a response</div>` : ""}
      </section>

      <section class="question-detail-section">
        <div class="detail-section-title">Process Status</div>
        <div class="visual-flow-shell">
          <div class="visual-flow-row main-row">
            ${node("Question", "Created", "done", "Q")}
            <div class="visual-connector active"></div>
            ${node("Answer", hasAnswer ? `${answers.length} response(s)` : "Waiting", answerState, "A")}
            <div class="visual-connector ${hasAnswer ? "active" : ""}"></div>
            ${node("AI Validation", blocking ? "Issue" : validated ? "Validated" : hasAnswer ? "Analyzing" : "Not started", validationState, "AI")}
            <div class="visual-connector ${hasAnswer ? "active" : ""}"></div>
            <div class="visual-decision-wrap"><div class="visual-decision ${blocking ? "blocked" : validated ? "done" : "waiting"}"><span>Conflict?</span></div></div>
          </div>

          <div class="visual-branch-area">
            <div class="visual-branch-line vertical"></div>
            <div class="visual-branch visual-branch-no">
              <div class="branch-label no">NO / CLEAR</div>
              ${node("Validated", blocking ? "Waiting" : hadPriorIssue ? "Resolved" : validated ? "Clear" : "Pending", clearBranchState, "✓")}
              <div class="visual-connector ${validated && !blocking ? "active" : ""}"></div>
              ${node("Requirement", hasRequirement ? `${requirements.length} created` : "Not created", requirementState, "R")}
              <div class="visual-connector ${hasRequirement ? "active" : ""}"></div>
              ${node("Dept. Approval", deptApproved ? "Approved" : deptRejected ? "Rejected" : deptClarify ? "Clarify" : "Pending", deptState, "D")}
              <div class="visual-connector ${deptApproved ? "active" : ""}"></div>
              ${node("Final Approval", finalApproved ? "Approved" : deptApproved ? "Pending" : "Locked", finalState, "F")}
            </div>
            <div class="visual-branch visual-branch-yes">
              <div class="branch-label yes">YES / ISSUE</div>
              ${node("Conflict", blocking ? "Open" : hadPriorIssue ? "Historical" : "None", conflictBranchState, "!")}
              <div class="visual-connector ${blocking ? "danger" : hadPriorIssue ? "resolved" : ""}"></div>
              ${node("Clarification", blocking ? "Required" : hadPriorIssue ? "Answered" : "Not required", blocking ? "waiting" : hadPriorIssue ? "done" : "locked", "?")}
              <div class="visual-connector ${hadPriorIssue ? "resolved" : ""}"></div>
              ${node("Re-validation", blocking ? "Pending" : hadPriorIssue ? "Done" : "Not required", blocking ? "waiting" : hadPriorIssue ? "done" : "locked", "↻")}
              <div class="visual-loop-label">back to AI Validation</div>
            </div>
          </div>
        </div>
        <div class="question-diagram-legend visual-legend">
          <span><i class="legend-dot done"></i> Completed / approved</span>
          <span><i class="legend-dot waiting"></i> Pending / waiting</span>
          <span><i class="legend-dot blocked"></i> Conflict / rejected / late</span>
          <span><i class="legend-dot locked"></i> Not started / locked</span>
        </div>
      </section>

      <section class="question-detail-section detail-two-column">
        <div><div class="detail-section-title">Question & Context</div><div class="detail-content-card"><div class="detail-question-text">${esc(question.text)}</div><div class="detail-meta-line"><span>Related: ${esc(question.related || "—")}</span><span>Owner: ${esc(question.owner || "—")}</span></div>${renderAttachments(question.attachments || [])}</div></div>
        <div><div class="detail-section-title">Validation Result</div><div class="detail-content-card">${findings.length ? findings.map(f => `<div class="detail-finding ${f.blocking ? "blocking" : ""}"><strong>${esc(f.finding_type || "Finding")}</strong><span>${esc(f.message || f.description || "Validation finding")}</span></div>`).join("") : `<div class="detail-empty">No active validation findings.</div>`}</div></div>
      </section>

      <section class="question-detail-section"><div class="detail-section-title">Answers & Evidence</div>${renderAnswers(answers)}</section>
      <section class="question-detail-section"><div class="detail-section-title">History / Iterations</div><div class="detail-timeline">${history.length ? history.map(event => `<div class="timeline-item"><div class="timeline-dot"></div><div><strong>${esc(event.title)}</strong><div class="detail-muted">${esc(event.at ? dateText(event.at) : "Current workflow")} · ${esc(event.detail || "")}</div></div></div>`).join("") : `<div class="detail-empty">No history yet.</div>`}</div></section>`;

    target.classList.remove("hidden");
    detailPage.activate();
    document.getElementById("closeQuestionDiagramVisual")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
      document.querySelectorAll(".page-section").forEach(section => section.classList.remove("active"));
      document.querySelector('.nav-item[data-section="questions"]')?.classList.add("active");
      document.getElementById("questions")?.classList.add("active");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  questionsSection.addEventListener("click", event => {
    const button = event.target.closest(".question-diagram-btn");
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    render(Number(button.dataset.index));
  }, true);

  window.renderVisualQuestionDiagram = render;
})();
