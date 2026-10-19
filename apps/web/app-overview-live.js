(() => {
  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function activeDepartmentApproval(requirementId) {
    return [...(state.departmentApprovals || [])].reverse().find(item =>
      item.requirementId === requirementId && item.active !== false && !item.stale
    );
  }

  function isApprovedRequirement(requirement) {
    const approval = activeDepartmentApproval(requirement.id);
    return approval?.packageStatus === "APPROVED" && approval?.approval;
  }

  function readiness() {
    return state.completion?.readiness || state.readiness || null;
  }

  function finalApproved() {
    const final = state.completion?.finalApproval || state.finalApproval;
    return final?.decision === "APPROVED" && final?.active !== false;
  }

  function okfReady() {
    return Boolean(state.completion?.okfArtifact || state.okfArtifact);
  }

  function consolidationReady() {
    return Boolean(state.completion?.consolidatedAnalysis?.ready_for_final_approval);
  }

  function activeBlockingFindings() {
    return (state.validationFindings || []).filter(f => f.blocking);
  }

  function renderMetricsLive() {
    const container = document.getElementById("metricGrid");
    if (!container) return;

    const requirements = state.requirements || [];
    const approvedRequirements = requirements.filter(isApprovedRequirement).length;
    const blockers = readiness()?.blockers || [];
    const ready = readiness()?.status === "READY_FOR_DELIVERY";
    const departments = [...new Set(requirements.map(r => r.department).filter(Boolean))];
    const approvedDepartments = [...new Set(requirements.filter(isApprovedRequirement).map(r => r.department).filter(Boolean))];

    const metrics = [
      ["Approved departments", `${approvedDepartments.length}/${departments.length || approvedDepartments.length}`, ready ? "All participating departments approved" : "Department approvals still in progress"],
      ["Open blockers", blockers.length, blockers.length ? `${blockers.length} blocker(s) remain` : "No blocking items"],
      ["Approved requirements", `${approvedRequirements}/${requirements.length}`, approvedRequirements === requirements.length ? "All requirements approved" : "Some requirements still need approval"],
      ["Readiness", ready ? "READY" : "BLOCKED", ready ? "Eligible for delivery" : "Gate conditions not yet satisfied"],
    ];

    container.innerHTML = metrics.map(([label, value, note]) => `
      <div class="metric">
        <div class="metric-label">${esc(label)}</div>
        <div class="metric-value">${esc(value)}</div>
        <div class="metric-note">${esc(note)}</div>
      </div>`).join("");
  }

  function renderWorkflowLive() {
    const container = document.getElementById("workflow");
    if (!container) return;

    const requirements = state.requirements || [];
    const allReqsApproved = requirements.length > 0 && requirements.every(isApprovedRequirement);
    const steps = [
      ["Question Generation", (state.questions || []).length > 0],
      ["Evidence Collection", (state.answers || []).length > 0],
      ["Validation", activeBlockingFindings().length === 0],
      ["Department Review", allReqsApproved],
      ["Cross-Department Review", consolidationReady()],
      ["Final Approval", finalApproved()],
      ["OKF Generation", okfReady()],
      ["Readiness Gate", readiness()?.status === "READY_FOR_DELIVERY"],
    ];

    let firstIncompleteSeen = false;
    container.innerHTML = steps.map(([name, done], index) => {
      let dotClass = "locked";
      let symbol = index + 1;
      let status = "Locked";
      if (done) {
        dotClass = "done";
        symbol = "✓";
        status = "Complete";
      } else if (!firstIncompleteSeen) {
        firstIncompleteSeen = true;
        dotClass = "current";
        symbol = "!";
        status = "Needs action";
      }
      return `
        <div class="workflow-step">
          <div class="step-dot ${dotClass}">${symbol}</div>
          <strong>${esc(name)}</strong>
          <div class="step-status">${esc(status)}</div>
        </div>`;
    }).join("");
  }

  function renderReadinessPanelLive() {
    const container = document.getElementById("blockers");
    const title = document.getElementById("readinessPanelTitle");
    const button = document.getElementById("resolveDemoBtn");
    if (!container || !title || !button) return;

    const result = readiness();
    const ready = result?.status === "READY_FOR_DELIVERY";
    const blockers = result?.blockers || [];

    button.style.display = "none";

    if (ready) {
      title.textContent = "Why the project is ready";
      container.innerHTML = `
        <div class="blocker" style="background:var(--good-bg);border-color:#abefc6">
          <strong style="color:var(--good)">All readiness gates passed</strong>
          <span style="color:#05603a">Department approvals, cross-department consolidation, final human approval, and OKF generation are complete.</span>
        </div>`;
      return;
    }

    title.textContent = "Why the project is blocked";
    if (!blockers.length) {
      container.innerHTML = `<div class="blocker"><strong>Readiness evaluation pending</strong><span>The live readiness gate has not completed yet.</span></div>`;
      return;
    }

    container.innerHTML = blockers.map(blocker => `
      <div class="blocker">
        <strong>${esc(blocker.reference || blocker.type || "Blocker")}</strong>
        <span>${esc(blocker.reason || "Required readiness condition has not passed.")}</span>
      </div>`).join("");
  }

  function renderOverviewLive() {
    renderMetricsLive();
    renderWorkflowLive();
    renderReadinessPanelLive();
  }

  window.renderOverviewLive = renderOverviewLive;

  let lastSignature = "";
  setInterval(() => {
    const signature = JSON.stringify({
      r: state.completion?.readiness,
      f: state.completion?.finalApproval,
      o: Boolean(state.completion?.okfArtifact),
      c: state.completion?.consolidatedAnalysis?.status,
      a: state.departmentApprovals,
      q: state.questions?.length,
      ans: state.answers?.length,
    });
    if (signature === lastSignature) return;
    lastSignature = signature;
    renderOverviewLive();
  }, 500);

  setTimeout(renderOverviewLive, 300);
})();
