(() => {
  const config = window.BASPIN_CONFIG || {};
  const agentsBase = (config.agentsApiBaseUrl || "").replace(/\/$/, "");
  const requirementsSection = document.getElementById("requirements");
  const table = document.getElementById("requirementTable");
  const validateButton = document.getElementById("validateAnswersBtn");
  if (!requirementsSection || !table || !validateButton) return;

  if (!Array.isArray(state.requirements)) state.requirements = [];

  const heading = requirementsSection.querySelector(".section-heading");
  const controls = document.createElement("div");
  controls.className = "form-actions";
  controls.innerHTML = `
    <button class="secondary-btn" type="button" id="refreshRequirementsBtn">Refresh requirements</button>
    <span class="form-status" id="requirementNormalizationStatus"></span>`;
  heading?.appendChild(controls);

  const refreshButton = document.getElementById("refreshRequirementsBtn");
  const statusEl = document.getElementById("requirementNormalizationStatus");

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

  function activeValidatedAnswers() {
    const supersededIds = new Set(
      state.answers?.flatMap(answer => Array.isArray(answer.supersedes) ? answer.supersedes : []) || []
    );
    return (state.answers || []).filter(answer =>
      answer.validationStatus === "VALIDATED" &&
      !answer.supersededBy &&
      !supersededIds.has(answer.id)
    );
  }

  function sourceIdsFor(answer) {
    const ids = [];
    if (answer.sourceName) ids.push(answer.sourceName);
    (answer.attachments || []).forEach(item => ids.push(item.id || item.name));
    return [...new Set(ids.filter(Boolean))];
  }

  function statusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "APPROVED") return "approved";
    if (["NEEDS_CLARIFICATION", "REJECTED", "STALE"].includes(value)) return value === "REJECTED" ? "critical" : "high";
    return "pending";
  }

  function renderLiveRequirements() {
    const requirements = state.requirements || [];
    if (!requirements.length) {
      table.innerHTML = `<tr><td colspan="5">No normalized requirements yet. Validate an approved answer first.</td></tr>`;
      return;
    }

    table.innerHTML = requirements.map(requirement => `
      <tr>
        <td><strong>${escapeHtml(requirement.id)}</strong><div class="card-meta">v${requirement.version || 1}</div></td>
        <td>${escapeHtml(requirement.requirement_type || requirement.type || "—")}</td>
        <td>${escapeHtml(requirement.department || "—")}</td>
        <td>
          <strong>${escapeHtml(requirement.title || "")}</strong>
          <div class="card-meta">${escapeHtml(requirement.description || "")}</div>
          <div class="card-meta">${escapeHtml(requirement.provenance_note || "")}</div>
        </td>
        <td><span class="status-pill ${statusClass(requirement.status)}">${escapeHtml(requirement.status || "DEPARTMENT_REVIEW")}</span></td>
      </tr>`).join("");
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

  function mergeRequirementVersions(incoming) {
    const previousById = new Map((state.requirements || []).map(item => [item.id, item]));
    return incoming.map(item => {
      const previous = previousById.get(item.id);
      let version = previous?.version || 1;
      const materiallyChanged = previous && (
        previous.description !== item.description ||
        previous.requirement_type !== item.requirement_type ||
        previous.department !== item.department ||
        previous.owner !== item.owner
      );
      if (materiallyChanged) version += 1;
      return {
        ...item,
        version,
        status: materiallyChanged ? "DEPARTMENT_REVIEW" : (previous?.status || item.status || "DEPARTMENT_REVIEW"),
        materiallyChanged: Boolean(materiallyChanged),
      };
    });
  }

  async function normalizeRequirements({ automatic = false } = {}) {
    const facts = activeValidatedAnswers();
    if (!facts.length) {
      state.requirements = [];
      renderLiveRequirements();
      statusEl.textContent = "No active VALIDATED facts are ready for normalization.";
      if (window.renderDepartmentApprovals) window.renderDepartmentApprovals();
      return;
    }

    refreshButton.disabled = true;
    refreshButton.textContent = "Normalizing…";
    statusEl.textContent = automatic
      ? "Validation passed. Creating requirements from validated facts…"
      : "Calling the live Requirement Normalization Agent…";

    try {
      const response = await postJson(`${agentsBase}/requirements/normalize`, {
        project_id: projectId(),
        facts: facts.map(answer => ({
          id: answer.id,
          topic: answer.topic,
          value: answer.value,
          department: answer.department || "Business",
          owner: answer.owner || null,
          source_ids: sourceIdsFor(answer),
          validation_status: "VALIDATED",
          process_step: answer.processStep || null,
        })),
      });

      state.requirements = mergeRequirementVersions(response.requirements || []);
      state.requirementNormalization = {
        at: new Date().toISOString(),
        skippedFactIds: response.skipped_fact_ids || [],
        warnings: response.warnings || [],
      };
      renderLiveRequirements();

      if (window.revalidateDepartmentApprovals) {
        await window.revalidateDepartmentApprovals();
      }
      if (window.renderDepartmentApprovals) window.renderDepartmentApprovals();

      const warningText = (response.warnings || []).length
        ? ` ${(response.warnings || []).join(" ")}`
        : "";
      statusEl.textContent = `${state.requirements.length} live requirement(s) created from ${facts.length} validated fact(s).${warningText}`;
    } catch (error) {
      statusEl.textContent = `Requirement normalization failed: ${error.message || error}`;
    } finally {
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh requirements";
    }
  }

  refreshButton.addEventListener("click", () => normalizeRequirements());

  validateButton.addEventListener("click", () => {
    const beforeRound = Array.isArray(state.validationHistory) ? state.validationHistory.length : 0;
    let attempts = 0;
    const watcher = setInterval(() => {
      attempts += 1;
      const afterRound = Array.isArray(state.validationHistory) ? state.validationHistory.length : 0;
      if (afterRound > beforeRound) {
        clearInterval(watcher);
        normalizeRequirements({ automatic: true });
        return;
      }
      if (attempts >= 120 || (!validateButton.disabled && attempts > 4)) {
        clearInterval(watcher);
      }
    }, 250);
  });

  window.normalizeRequirements = normalizeRequirements;
  window.renderLiveRequirements = renderLiveRequirements;

  if (Array.isArray(state.answers) && state.answers.length) renderLiveRequirements();
})();
