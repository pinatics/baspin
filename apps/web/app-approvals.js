(() => {
  const config = window.BASPIN_CONFIG || {};
  const workflowBase = (config.workflowApiBaseUrl || "").replace(/\/$/, "");
  const grid = document.getElementById("approvalGrid");
  if (!grid) return;

  if (!Array.isArray(state.departmentApprovals)) state.departmentApprovals = [];

  function escapeHtml(value) {
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

  function openConflictIdsForRequirement(requirement) {
    const sourceFactIds = new Set(requirement.source_fact_ids || []);
    return (state.validationFindings || [])
      .filter(finding => finding.blocking && (finding.related_fact_ids || []).some(id => sourceFactIds.has(id)))
      .map(finding => finding.id);
  }

  function activeApprovalFor(requirementId) {
    return [...state.departmentApprovals]
      .reverse()
      .find(item => item.requirementId === requirementId && item.active !== false);
  }

  function statusClass(value) {
    const status = String(value || "").toUpperCase();
    if (status === "APPROVED") return "approved";
    if (status === "REJECTED") return "critical";
    if (["NEEDS_CLARIFICATION", "STALE"].includes(status)) return "high";
    return "pending";
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

  function buildPackage(requirement) {
    return {
      id: `PKG-${requirement.id}-v${requirement.version || 1}`,
      project_id: projectId(),
      department: requirement.department,
      reviewer: requirement.owner || `${requirement.department} Owner`,
      requirements: [{
        requirement_id: requirement.id,
        version: requirement.version || 1,
        title: requirement.title,
        description: requirement.description,
        owner: requirement.owner || null,
        department: requirement.department,
      }],
      open_conflict_ids: openConflictIdsForRequirement(requirement),
      status: "SENT_FOR_REVIEW",
    };
  }

  async function submitDecision(requirementId, decision) {
    const requirement = (state.requirements || []).find(item => item.id === requirementId);
    if (!requirement) return;

    const commentEl = document.querySelector(`[data-approval-comment="${requirementId}"]`);
    const approverEl = document.querySelector(`[data-approval-approver="${requirementId}"]`);
    const statusEl = document.querySelector(`[data-approval-status="${requirementId}"]`);
    const approver = approverEl?.value.trim() || requirement.owner || `${requirement.department} Owner`;
    const comment = commentEl?.value.trim() || null;

    if (statusEl) statusEl.textContent = "Submitting decision…";

    try {
      const response = await postJson(`${workflowBase}/approvals/department`, {
        package: buildPackage(requirement),
        decision,
        approver,
        comment,
      });

      const previous = activeApprovalFor(requirement.id);
      if (previous) previous.active = false;

      state.departmentApprovals.push({
        requirementId: requirement.id,
        requirementVersion: requirement.version || 1,
        packageStatus: response.package_status,
        approval: response.approval,
        active: true,
        stale: false,
      });

      requirement.status = response.package_status;

      if (decision === "NEEDS_CLARIFICATION") {
        const relatedFactId = requirement.source_fact_ids?.[0];
        const relatedAnswer = (state.answers || []).find(answer => answer.id === relatedFactId);
        const baseQuestion = relatedAnswer ? state.questions?.[relatedAnswer.questionIndex] : null;
        const clarificationText = comment || `Please clarify requirement ${requirement.id} before approval.`;
        const existing = (state.questions || []).some(q => q.related === `approval:${requirement.id}:v${requirement.version || 1}`);
        if (!existing && Array.isArray(state.questions)) {
          state.questions.push({
            id: `approval-clarification-${requirement.id}-v${requirement.version || 1}`,
            priority: "HIGH",
            department: requirement.department,
            text: clarificationText,
            owner: requirement.owner || baseQuestion?.owner || "Department Owner",
            type: "CLARIFICATION",
            topic: relatedAnswer?.topic || requirement.title,
            related: `approval:${requirement.id}:v${requirement.version || 1}`,
            source: "Human Review",
            editedByBA: false,
            attachments: [],
          });
        }
        if (window.renderQuestions) window.renderQuestions();
        if (window.renderAnswers) window.renderAnswers();
      }

      if (window.renderLiveRequirements) window.renderLiveRequirements();
      window.renderDepartmentApprovals();
    } catch (error) {
      if (statusEl) statusEl.textContent = `Approval failed: ${error.message || error}`;
    }
  }

  window.renderDepartmentApprovals = function renderDepartmentApprovals() {
    const requirements = state.requirements || [];
    if (!requirements.length) {
      grid.innerHTML = `<div class="mini-card"><div class="card-title">No requirements ready for review</div><div class="card-meta">Validate and normalize requirements first.</div></div>`;
      return;
    }

    grid.innerHTML = requirements.map(requirement => {
      const record = activeApprovalFor(requirement.id);
      const currentStatus = record?.stale ? "STALE" : (record?.packageStatus || requirement.status || "DEPARTMENT_REVIEW");
      const conflictCount = openConflictIdsForRequirement(requirement).length;
      const approvalMeta = record?.approval
        ? `Approver: ${escapeHtml(record.approval.approver)} · Decision: ${escapeHtml(record.approval.decision)} · Version v${record.requirementVersion}`
        : `Owner: ${escapeHtml(requirement.owner || "Department Owner")} · Version v${requirement.version || 1}`;

      return `
        <div class="mini-card approval-review-card">
          <div class="card-row">
            <div>
              <div class="eyebrow">${escapeHtml(requirement.department || "Department")}</div>
              <div class="card-title">${escapeHtml(requirement.title || requirement.id)}</div>
            </div>
            <span class="status-pill ${statusClass(currentStatus)}">${escapeHtml(currentStatus)}</span>
          </div>
          <div class="card-meta">${escapeHtml(requirement.description || "")}</div>
          <div class="card-meta">${approvalMeta}</div>
          ${conflictCount ? `<div class="card-meta" style="color:var(--bad)">${conflictCount} blocking conflict(s) prevent approval.</div>` : ""}
          <label style="display:grid;gap:6px;margin-top:12px;font-size:12px;font-weight:700">Approver
            <input data-approval-approver="${escapeHtml(requirement.id)}" value="${escapeHtml(requirement.owner || "")}" />
          </label>
          <label style="display:grid;gap:6px;margin-top:10px;font-size:12px;font-weight:700">Comment
            <textarea data-approval-comment="${escapeHtml(requirement.id)}" rows="3" placeholder="Optional review comment"></textarea>
          </label>
          <div class="form-actions" style="margin-top:10px">
            <button class="primary-btn approval-decision-btn" type="button" data-id="${escapeHtml(requirement.id)}" data-decision="APPROVED" ${conflictCount ? "disabled" : ""}>Approve</button>
            <button class="secondary-btn approval-decision-btn" type="button" data-id="${escapeHtml(requirement.id)}" data-decision="NEEDS_CLARIFICATION">Needs Clarification</button>
            <button class="secondary-btn approval-decision-btn" type="button" data-id="${escapeHtml(requirement.id)}" data-decision="REJECTED">Reject / Return</button>
          </div>
          <div class="form-status" data-approval-status="${escapeHtml(requirement.id)}"></div>
        </div>`;
    }).join("");

    document.querySelectorAll(".approval-decision-btn").forEach(button => {
      button.addEventListener("click", () => submitDecision(button.dataset.id, button.dataset.decision));
    });
  };

  window.revalidateDepartmentApprovals = async function revalidateDepartmentApprovals() {
    const currentVersions = Object.fromEntries((state.requirements || []).map(req => [req.id, req.version || 1]));

    for (const item of state.departmentApprovals) {
      if (!item.active || !item.approval) continue;
      try {
        const response = await postJson(`${workflowBase}/approvals/revalidate`, {
          approval: item.approval,
          current_requirement_versions: currentVersions,
        });
        item.stale = !response.remains_valid;
        item.staleReason = response.reason || null;
        if (item.stale) {
          const requirement = (state.requirements || []).find(req => req.id === item.requirementId);
          if (requirement) requirement.status = "DEPARTMENT_REVIEW";
        }
      } catch (error) {
        console.warn("Approval revalidation failed", error);
      }
    }
    window.renderDepartmentApprovals();
  };

  window.renderDepartmentApprovals();
})();
