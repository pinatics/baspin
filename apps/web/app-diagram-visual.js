(() => {
  const panel = document.getElementById("questionProcessPanel");
  const questionsSection = document.getElementById("questions");
  if (!questionsSection) return;

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

  function nodeClass(stateName) {
    return `visual-node ${stateName}`;
  }

  function node(title, subtitle, stateName, icon, extra = "") {
    return `
      <div class="${nodeClass(stateName)} ${extra}">
        <div class="visual-node-icon">${icon}</div>
        <div class="visual-node-title">${esc(title)}</div>
        <div class="visual-node-subtitle">${esc(subtitle)}</div>
      </div>`;
  }

  function render(index) {
    const question = state.questions?.[index];
    const target = document.getElementById("questionProcessPanel");
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
      (round.findings || []).some(f =>
        (f.related_fact_ids || []).some(id => answers.some(a => a.id === id))
      )
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

    target.innerHTML = `
      <div class="panel-header visual-diagram-header">
        <div>
          <div class="eyebrow">Live question flow</div>
          <h2>${esc(question.department || "Department")} · ${esc(question.text)}</h2>
        </div>
        <button class="secondary-btn" id="closeQuestionDiagramVisual" type="button">Close</button>
      </div>

      <div class="question-diagram-summary">
        <span class="status-pill ${status === "VALIDATED" ? "approved" : status === "CONFLICT" ? "critical" : status === "LATE" ? "late" : status === "ANSWERED" ? "high" : "pending"}">${esc(status)}</span>
        <span>Owner: <strong>${esc(question.owner || "—")}</strong></span>
        <span>Created: ${esc(dateText(question.createdAt))}</span>
        <span>Last answer: ${esc(lastAnswer ? dateText(lastAnswer) : "No answer yet")}</span>
        ${status === "LATE" ? `<span class="late-note">48+ hours without response</span>` : ""}
      </div>

      <div class="visual-flow-shell">
        <div class="visual-flow-row main-row">
          ${node("Question", "Created and assigned", "done", "Q")}
          <div class="visual-connector active"></div>
          ${node("Answer", hasAnswer ? `${answers.length} response(s)` : "Waiting for response", answerState, "A")}
          <div class="visual-connector ${hasAnswer ? "active" : ""}"></div>
          ${node("AI Validation", blocking ? "Blocking issue found" : validated ? "Validated" : hasAnswer ? "Analyzing" : "Not started", validationState, "AI")}
          <div class="visual-connector ${hasAnswer ? "active" : ""}"></div>
          <div class="visual-decision-wrap">
            <div class="visual-decision ${blocking ? "blocked" : validated ? "done" : "waiting"}">
              <span>Conflict?</span>
            </div>
          </div>
        </div>

        <div class="visual-branch-area">
          <div class="visual-branch-line vertical"></div>

          <div class="visual-branch visual-branch-no">
            <div class="branch-label no">NO / CLEAR</div>
            ${node("Validated Knowledge", blocking ? "Waiting for resolution" : hadPriorIssue ? "Issue resolved" : validated ? "Clear" : "Pending", clearBranchState, "✓")}
            <div class="visual-connector ${validated && !blocking ? "active" : ""}"></div>
            ${node("Requirement", hasRequirement ? `${requirements.length} requirement(s)` : "Not created yet", requirementState, "R")}
            <div class="visual-connector ${hasRequirement ? "active" : ""}"></div>
            ${node("Department Approval", deptApproved ? "Approved" : deptRejected ? "Rejected" : deptClarify ? "Clarification / re-approval" : "Pending", deptState, "D")}
            <div class="visual-connector ${deptApproved ? "active" : ""}"></div>
            ${node("Final Approval", finalApproved ? "Approved" : deptApproved ? "Pending final approval" : "Locked", finalState, "F")}
          </div>

          <div class="visual-branch visual-branch-yes">
            <div class="branch-label yes">YES / ISSUE</div>
            ${node("Conflict / Ambiguity", blocking ? "Open finding" : hadPriorIssue ? "Historical issue" : "No issue", conflictBranchState, "!")}
            <div class="visual-connector ${blocking ? "danger" : hadPriorIssue ? "resolved" : ""}"></div>
            ${node("Clarification", blocking ? "New question required" : hadPriorIssue ? "Answered" : "Not required", blocking ? "waiting" : hadPriorIssue ? "done" : "locked", "?")}
            <div class="visual-connector ${hadPriorIssue ? "resolved" : ""}"></div>
            ${node("Re-validation", blocking ? "Pending" : hadPriorIssue ? "Completed" : "Not required", blocking ? "waiting" : hadPriorIssue ? "done" : "locked", "↻")}
            <div class="visual-loop-label">returns to AI Validation</div>
          </div>
        </div>
      </div>

      <div class="question-diagram-legend visual-legend">
        <span><i class="legend-dot done"></i> Completed / approved</span>
        <span><i class="legend-dot waiting"></i> Pending / waiting</span>
        <span><i class="legend-dot blocked"></i> Conflict / rejected / late</span>
        <span><i class="legend-dot locked"></i> Not started / locked</span>
      </div>`;

    target.classList.remove("hidden");
    document.getElementById("closeQuestionDiagramVisual")?.addEventListener("click", () => target.classList.add("hidden"));
    target.scrollIntoView({ behavior: "smooth", block: "start" });
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
