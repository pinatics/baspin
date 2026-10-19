(() => {
  const config = window.BASPIN_CONFIG || {};
  const workflowBase = (config.workflowApiBaseUrl || "").replace(/\/$/, "");
  const agentsBase = (config.agentsApiBaseUrl || "").replace(/\/$/, "");
  const approvalGrid = document.getElementById("approvalGrid");
  const okfLock = document.getElementById("okfLock");
  const okfPreview = document.getElementById("okfPreview");
  const readinessBadge = document.getElementById("readinessBadge");
  if (!approvalGrid || !okfPreview || !readinessBadge) return;

  if (!state.completion) {
    state.completion = {
      consolidatedAnalysis: null,
      consolidatedAnalysisId: null,
      consolidatedAnalysisVersion: 0,
      snapshotKey: null,
      finalApproval: null,
      okfArtifact: null,
      readiness: null,
    };
  }

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function projectId() {
    return state.currentProject?.id || "insurance-automated-claim-approval";
  }

  function projectName() {
    return state.currentProject?.name || document.getElementById("projectTitle")?.textContent || "Baspin Project";
  }

  function businessGoal() {
    return state.currentProject?.goal || document.getElementById("projectGoal")?.textContent || "Validated business requirements";
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

  function activeApprovalFor(requirementId) {
    return [...(state.departmentApprovals || [])].reverse().find(item =>
      item.requirementId === requirementId && item.active !== false && !item.stale
    );
  }

  function sourceAnswerFor(requirement) {
    const ids = new Set(requirement.source_fact_ids || []);
    return (state.answers || []).find(answer => ids.has(answer.id));
  }

  function approvedRequirementRows() {
    return (state.requirements || []).map(requirement => {
      const record = activeApprovalFor(requirement.id);
      if (!record || record.packageStatus !== "APPROVED" || !record.approval) return null;
      const answer = sourceAnswerFor(requirement);
      return {
        requirement_id: requirement.id,
        version: requirement.version || 1,
        title: requirement.title || requirement.id,
        description: requirement.description || "",
        requirement_type: requirement.requirement_type || requirement.type || "BUSINESS_RULE",
        department: requirement.department || "Business",
        owner: requirement.owner || null,
        process_step: answer?.processStep || null,
        source_ids: requirement.source_ids || [],
        approval_id: record.approval.id,
        approved: true,
      };
    }).filter(Boolean);
  }

  function allRequirementsApproved() {
    const requirements = state.requirements || [];
    return requirements.length > 0 && requirements.every(req => {
      const approval = activeApprovalFor(req.id);
      return approval?.packageStatus === "APPROVED" && approval?.approval;
    });
  }

  function makeSnapshotKey(rows) {
    return rows.map(row => `${row.requirement_id}:v${row.version}:${row.approval_id}`).sort().join("|");
  }

  async function runConsolidation() {
    if (!allRequirementsApproved()) {
      state.completion.consolidatedAnalysis = null;
      return null;
    }

    const rows = approvedRequirementRows();
    const mandatoryDepartments = [...new Set(rows.map(row => row.department))];
    const snapshotKey = makeSnapshotKey(rows);

    if (state.completion.snapshotKey !== snapshotKey) {
      state.completion.consolidatedAnalysisVersion += 1;
      state.completion.snapshotKey = snapshotKey;
      state.completion.consolidatedAnalysisId = `CA-${projectId()}`;
      if (state.completion.finalApproval) state.completion.finalApproval.active = false;
      state.completion.finalApproval = null;
      state.finalApproval = null;
      state.completion.okfArtifact = null;
      state.completion.readiness = null;
    }

    const analysis = await postJson(`${workflowBase}/consolidation/evaluate`, {
      project_id: projectId(),
      requirements: rows,
      mandatory_departments: mandatoryDepartments,
    });
    state.completion.consolidatedAnalysis = analysis;
    return analysis;
  }

  function finalApprovalReady() {
    return Boolean(
      state.completion.consolidatedAnalysis?.ready_for_final_approval &&
      allRequirementsApproved()
    );
  }

  async function submitFinalApproval(decision) {
    const statusEl = document.getElementById("finalApprovalStatus");
    const approver = document.getElementById("finalApprover")?.value.trim() || "Business Sponsor";
    const role = document.getElementById("finalApproverRole")?.value.trim() || "Business Sponsor";
    const comment = document.getElementById("finalApprovalComment")?.value.trim() || null;

    if (!finalApprovalReady()) {
      if (statusEl) statusEl.textContent = "Final approval is locked until all department approvals and consolidation checks pass.";
      return;
    }
    if (statusEl) statusEl.textContent = "Submitting final decision…";

    try {
      const response = await postJson(`${workflowBase}/approvals/final`, {
        project_id: projectId(),
        consolidated_analysis_id: state.completion.consolidatedAnalysisId,
        consolidated_analysis_version: state.completion.consolidatedAnalysisVersion,
        decision,
        approver,
        role,
        comment,
      });
      state.completion.finalApproval = response.approval;
      state.finalApproval = response.approval;

      if (response.approved_for_okf) {
        await generateOKF();
      } else {
        state.completion.okfArtifact = null;
        renderOKF();
        await evaluateReadiness();
      }
      renderCompletionApprovals();
      if (window.renderVisualQuestionDiagram && Number.isInteger(state.selectedQuestionDetailIndex)) {
        window.renderVisualQuestionDiagram(state.selectedQuestionDetailIndex);
      }
    } catch (error) {
      if (statusEl) statusEl.textContent = `Final approval failed: ${error.message || error}`;
    }
  }

  async function generateOKF() {
    const approval = state.completion.finalApproval;
    if (!approval || approval.decision !== "APPROVED" || approval.active === false) return null;

    const requirements = approvedRequirementRows().map(row => ({
      requirement_id: row.requirement_id,
      title: row.title,
      description: row.description,
      requirement_type: row.requirement_type,
      department: row.department,
      owner: row.owner,
      source_ids: row.source_ids,
      process_step: row.process_step,
      approved: true,
    }));

    const response = await postJson(`${agentsBase}/okf/convert`, {
      project_id: projectId(),
      project_name: projectName(),
      business_goal: businessGoal(),
      consolidated_analysis_id: state.completion.consolidatedAnalysisId,
      consolidated_analysis_version: state.completion.consolidatedAnalysisVersion,
      final_approval: {
        approval_id: approval.id,
        decision: approval.decision,
        active: approval.active !== false,
        consolidated_analysis_id: approval.consolidated_analysis_id,
        consolidated_analysis_version: approval.consolidated_analysis_version,
      },
      requirements,
    });

    state.completion.okfArtifact = response.artifact;
    state.okfArtifact = response.artifact;
    renderOKF(response.warnings || []);
    await evaluateReadiness();
    return response.artifact;
  }

  async function evaluateReadiness() {
    const requirements = state.requirements || [];
    const approvedRows = approvedRequirementRows();
    const activeFindings = (state.validationFindings || []).filter(f => f.blocking);
    const finalApproval = state.completion.finalApproval;
    const okfReady = Boolean(state.completion.okfArtifact);

    const checks = [
      {
        check_type: "validated_requirements",
        required: true,
        status: requirements.length > 0 && approvedRows.length === requirements.length ? "PASS" : "FAIL",
        owner: "Business Analyst",
        blocking_reason: approvedRows.length === requirements.length ? null : "Not all requirements are approved.",
      },
      {
        check_type: "cross_department_consolidation",
        required: true,
        status: state.completion.consolidatedAnalysis?.ready_for_final_approval ? "PASS" : "FAIL",
        owner: "Business Analyst",
        blocking_reason: state.completion.consolidatedAnalysis?.ready_for_final_approval ? null : "Cross-department consolidation is not ready.",
      },
      {
        check_type: "final_human_approval",
        required: true,
        status: finalApproval?.decision === "APPROVED" && finalApproval?.active !== false ? "PASS" : "FAIL",
        owner: finalApproval?.approver || "Business Sponsor",
        blocking_reason: finalApproval?.decision === "APPROVED" ? null : "Final human approval has not been granted.",
      },
      {
        check_type: "okf_generation",
        required: true,
        status: okfReady ? "PASS" : "FAIL",
        owner: "Baspin",
        blocking_reason: okfReady ? null : "Approved OKF artifact has not been generated.",
      },
    ];

    const conflicts = activeFindings.map(finding => ({
      id: finding.id || `finding-${Math.random().toString(36).slice(2, 7)}`,
      severity: finding.severity || "HIGH",
      status: "OPEN",
      owner: finding.owner || null,
      description: finding.message || finding.description || "Blocking validation finding",
    }));

    const approvals = approvedRows.map(row => ({
      id: row.approval_id,
      target_type: "REQUIREMENT",
      decision: "APPROVED",
      mandatory: true,
      approver: row.owner,
    }));
    if (finalApproval) {
      approvals.push({
        id: finalApproval.id,
        target_type: "FINAL_ANALYSIS",
        decision: finalApproval.decision,
        mandatory: true,
        approver: finalApproval.approver,
      });
    }

    try {
      const response = await postJson(`${workflowBase}/readiness/evaluate`, {
        project_id: projectId(),
        checks,
        conflicts,
        approvals,
      });
      state.completion.readiness = response;
      state.readiness = response;
      renderReadiness(response);
      return response;
    } catch (error) {
      console.warn("Readiness evaluation failed", error);
      return null;
    }
  }

  function renderReadiness(readiness = state.completion.readiness) {
    if (!readiness) {
      readinessBadge.textContent = "BLOCKED";
      readinessBadge.className = "readiness-badge blocked";
      return;
    }
    const ready = readiness.status === "READY_FOR_DELIVERY";
    readinessBadge.textContent = ready ? "READY FOR DELIVERY" : "BLOCKED";
    readinessBadge.className = `readiness-badge ${ready ? "ready" : "blocked"}`;
  }

  function renderOKF(warnings = []) {
    const artifact = state.completion.okfArtifact;
    if (!artifact) {
      okfLock?.classList.remove("hidden");
      if (okfLock) okfLock.textContent = "OKF is locked until department approvals, consolidation, and final human approval are complete.";
      okfPreview.textContent = "// Waiting for final approved analysis";
      return;
    }
    okfLock?.classList.add("hidden");
    okfPreview.textContent = JSON.stringify(artifact.content, null, 2);
    if (warnings.length) okfPreview.textContent += `\n\n// Warnings\n// ${warnings.join("\n// ")}`;
  }

  function consolidationStatusClass() {
    const status = state.completion.consolidatedAnalysis?.status;
    if (status === "READY_FOR_FINAL_APPROVAL") return "approved";
    if (status === "BLOCKED") return "critical";
    return "pending";
  }

  function renderCompletionApprovals() {
    document.getElementById("completionGovernance")?.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "completionGovernance";
    wrapper.style.display = "contents";

    const analysis = state.completion.consolidatedAnalysis;
    const allApproved = allRequirementsApproved();
    const consolidationCard = document.createElement("div");
    consolidationCard.className = "mini-card approval-review-card";
    consolidationCard.innerHTML = `
      <div class="card-row">
        <div><div class="eyebrow">Cross-Department Gate</div><div class="card-title">Consolidated Analysis</div></div>
        <span class="status-pill ${consolidationStatusClass()}">${esc(analysis?.status || (allApproved ? "CHECKING" : "LOCKED"))}</span>
      </div>
      <div class="card-meta">${esc(analysis?.summary || (allApproved ? "Checking approved requirements for cross-department consistency." : "Approve all department requirements first."))}</div>
      ${analysis?.issues?.length ? `<div class="card-meta" style="color:var(--bad)">${analysis.issues.length} cross-department issue(s) found.</div>` : ""}
      <div class="form-actions" style="margin-top:10px"><button class="secondary-btn" type="button" id="runConsolidationBtn" ${allApproved ? "" : "disabled"}>Run consolidation check</button></div>
      <div class="form-status" id="consolidationStatus"></div>`;

    const final = state.completion.finalApproval;
    const finalCard = document.createElement("div");
    finalCard.className = "mini-card approval-review-card";
    const finalStatus = final?.decision || (finalApprovalReady() ? "READY FOR DECISION" : "LOCKED");
    finalCard.innerHTML = `
      <div class="card-row">
        <div><div class="eyebrow">Final Human Gate</div><div class="card-title">Final Approval</div></div>
        <span class="status-pill ${final?.decision === "APPROVED" ? "approved" : final?.decision === "REJECTED" ? "critical" : "pending"}">${esc(finalStatus)}</span>
      </div>
      <div class="card-meta">Analysis: ${esc(state.completion.consolidatedAnalysisId || "—")} · v${state.completion.consolidatedAnalysisVersion || 0}</div>
      <label style="display:grid;gap:6px;margin-top:12px;font-size:12px;font-weight:700">Approver
        <input id="finalApprover" value="${esc(final?.approver || "Business Sponsor")}" />
      </label>
      <label style="display:grid;gap:6px;margin-top:10px;font-size:12px;font-weight:700">Role
        <input id="finalApproverRole" value="${esc(final?.role || "Business Sponsor")}" />
      </label>
      <label style="display:grid;gap:6px;margin-top:10px;font-size:12px;font-weight:700">Comment
        <textarea id="finalApprovalComment" rows="3" placeholder="Optional final decision comment">${esc(final?.comment || "")}</textarea>
      </label>
      <div class="form-actions" style="margin-top:10px">
        <button class="primary-btn final-decision-btn" data-final-decision="APPROVED" type="button" ${finalApprovalReady() ? "" : "disabled"}>Final Approve</button>
        <button class="secondary-btn final-decision-btn" data-final-decision="NEEDS_CLARIFICATION" type="button" ${finalApprovalReady() ? "" : "disabled"}>Needs Clarification</button>
        <button class="secondary-btn final-decision-btn" data-final-decision="REJECTED" type="button" ${finalApprovalReady() ? "" : "disabled"}>Reject</button>
      </div>
      <div class="form-status" id="finalApprovalStatus">${final?.decision === "APPROVED" ? "Final approval recorded. OKF generation is enabled." : ""}</div>`;

    wrapper.appendChild(consolidationCard);
    wrapper.appendChild(finalCard);
    approvalGrid.appendChild(wrapper);

    document.getElementById("runConsolidationBtn")?.addEventListener("click", async () => {
      const el = document.getElementById("consolidationStatus");
      if (el) el.textContent = "Running cross-department checks…";
      try {
        await runConsolidation();
        if (el) el.textContent = state.completion.consolidatedAnalysis?.ready_for_final_approval ? "Ready for final approval." : "Consolidation still has blockers.";
        renderCompletionApprovals();
        await evaluateReadiness();
      } catch (error) {
        if (el) el.textContent = `Consolidation failed: ${error.message || error}`;
      }
    });

    document.querySelectorAll(".final-decision-btn").forEach(button => {
      button.addEventListener("click", () => submitFinalApproval(button.dataset.finalDecision));
    });
  }

  async function refreshCompletionFlow() {
    try {
      if (allRequirementsApproved()) await runConsolidation();
      renderCompletionApprovals();
      renderOKF();
      await evaluateReadiness();
    } catch (error) {
      console.warn("Completion flow refresh failed", error);
      renderCompletionApprovals();
    }
  }

  // Keep completion cards attached when the department approval renderer redraws the grid.
  const observer = new MutationObserver(() => {
    if (!document.getElementById("completionGovernance")) renderCompletionApprovals();
  });
  observer.observe(approvalGrid, { childList: true });

  window.refreshCompletionFlow = refreshCompletionFlow;
  window.renderCompletionApprovals = renderCompletionApprovals;
  window.generateOKF = generateOKF;
  window.evaluateBaspinReadiness = evaluateReadiness;

  renderOKF();
  refreshCompletionFlow();
})();
