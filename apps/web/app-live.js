(() => {
  const config = window.BASPIN_CONFIG || {};
  if (config.mode !== "live") return;

  const workflowBase = (config.workflowApiBaseUrl || "").replace(/\/$/, "");
  const agentsBase = (config.agentsApiBaseUrl || "").replace(/\/$/, "");
  const button = document.getElementById("resolveDemoBtn");
  const blockers = document.getElementById("blockers");

  async function requestJson(url, options = {}) {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });

    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }

    if (!response.ok) {
      const detail = body?.detail || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    return body;
  }

  async function checkServices() {
    const [workflow, agents] = await Promise.all([
      requestJson(`${workflowBase}/health`),
      requestJson(`${agentsBase}/health`),
    ]);

    if (workflow?.status !== "ok" || agents?.status !== "ok") {
      throw new Error("One or more Baspin backend services are not healthy.");
    }
  }

  async function runLiveResolution() {
    button.disabled = true;
    button.textContent = "Validating with Baspin…";

    try {
      await checkServices();

      const validation = await requestJson(`${agentsBase}/validation/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          project_id: "insurance-automated-claim-approval",
          required_topics: ["automatic_claim_approval_threshold"],
          facts: [
            {
              id: "FACT-CLAIMS-RESOLVED",
              topic: "automatic_claim_approval_threshold",
              value: "$25,000",
              source_type: "policy_and_human_confirmation",
              source_name: "Claims SOP v3.1 + Claims Manager confirmation",
              department: "Claims Operations",
              owner: "Claims Manager",
              approved: true,
              process_step: "claim_decision"
            }
          ]
        })
      });

      const blockingFindings = (validation.findings || []).filter(f => f.blocking);
      if (blockingFindings.length) {
        throw new Error("Validation still contains a blocking finding.");
      }

      const readiness = await requestJson(`${workflowBase}/readiness/evaluate`, {
        method: "POST",
        body: JSON.stringify({
          project_id: "insurance-automated-claim-approval",
          checks: [
            { check_type: "department_approvals", required: true, status: "PASS", owner: "Business Analyst" },
            { check_type: "critical_conflicts", required: true, status: "PASS", owner: "Claims Operations" },
            { check_type: "mandatory_requirements", required: true, status: "PASS", owner: "Business Analyst" },
            { check_type: "final_approval", required: true, status: "PASS", owner: "Business Sponsor" },
            { check_type: "okf_artifact", required: true, status: "PASS", owner: "Business Analyst" }
          ],
          conflicts: [],
          approvals: [
            {
              id: "FAPR-LIVE-DEMO",
              target_type: "Final Analysis",
              decision: "APPROVED",
              mandatory: true,
              approver: "Business Sponsor"
            }
          ]
        })
      });

      if (readiness.status !== "READY_FOR_DELIVERY") {
        const reasons = (readiness.blockers || []).map(b => b.reason).join("; ");
        throw new Error(reasons || "Readiness API did not return READY_FOR_DELIVERY.");
      }

      state.resolved = true;
      renderAll();
      button.textContent = "Re-run live validation";
    } catch (error) {
      state.resolved = false;
      renderAll();
      blockers.insertAdjacentHTML(
        "afterbegin",
        `<div class="blocker"><strong>Live API check failed</strong><span>${String(error.message || error)}</span></div>`
      );
      button.textContent = "Try live validation again";
    } finally {
      button.disabled = false;
    }
  }

  // Capture phase prevents app.js's local demo toggle from firing in live mode.
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    runLiveResolution();
  }, true);

  checkServices()
    .then(() => console.info("Baspin workflow and agents APIs connected."))
    .catch(error => console.warn("Baspin live services unavailable.", error));
})();
