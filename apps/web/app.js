const config = window.BASPIN_CONFIG || {
  mode: "demo",
  workflowApiBaseUrl: "",
  agentsApiBaseUrl: "",
};

const state = {
  resolved: false,
  departments: [
    { name: "Claims Operations", owner: "Claims Manager", status: "NEEDS CLARIFICATION", required: true },
    { name: "Fraud", owner: "Fraud Manager", status: "APPROVED", required: true },
    { name: "Finance", owner: "Finance Operations Manager", status: "APPROVED", required: true },
    { name: "Legal", owner: "Legal Counsel", status: "APPROVED", required: true },
    { name: "Compliance", owner: "Compliance Officer", status: "APPROVED", required: true },
    { name: "IT / Engineering", owner: "Claims Platform Owner", status: "APPROVED", required: true },
  ],
  questions: [
    {
      priority: "CRITICAL",
      department: "Claims Operations",
      text: "Please clarify and confirm the authoritative automatic claim approval threshold: $20,000 or $25,000?",
      owner: "Claims Manager",
    },
    {
      priority: "HIGH",
      department: "Claims Operations",
      text: "Which claim types must always receive manual review?",
      owner: "Claims Manager",
    },
    {
      priority: "HIGH",
      department: "Fraud",
      text: "Which fraud indicators should block automatic approval?",
      owner: "Fraud Manager",
    },
    {
      priority: "HIGH",
      department: "Finance",
      text: "What payment value requires additional financial authorization?",
      owner: "Finance Operations Manager",
    },
  ],
  requirements: [
    {
      id: "REQ-CLAIMS-001",
      type: "BUSINESS RULE",
      department: "Claims Operations",
      description: "Eligible claims up to $25,000 may be automatically approved when required documents are complete, coverage is valid, and no blocking fraud or exception condition exists.",
      status: "PENDING",
      required: true,
    },
    {
      id: "REQ-FIN-001",
      type: "FINANCIAL CONTROL",
      department: "Finance",
      description: "Payment release above $15,000 requires Finance authorization.",
      status: "APPROVED",
      required: true,
    },
    {
      id: "REQ-LEGAL-001",
      type: "COMPLIANCE REQUIREMENT",
      department: "Legal",
      description: "Automated claim decision evidence must be retained for 7 years.",
      status: "APPROVED",
      required: true,
    },
  ],
};

const workflowSteps = [
  "Question Generation",
  "Evidence Collection",
  "Validation",
  "Department Review",
  "Cross-Department Review",
  "Final Approval",
  "OKF Generation",
  "Readiness Gate",
];

function currentDepartments() {
  return state.departments.map((department, index) => ({
    ...department,
    status: state.resolved && index === 0 ? "APPROVED" : department.status,
  }));
}

function currentRequirements() {
  return state.requirements.map((requirement, index) => ({
    ...requirement,
    status: state.resolved && index === 0 ? "APPROVED" : requirement.status,
  }));
}

function slugStatus(value) {
  const v = value.toLowerCase();
  if (v.includes("approved") || v.includes("pass") || v.includes("ready")) return "approved";
  if (v.includes("clarification")) return "clarification";
  if (v.includes("blocked") || v.includes("fail")) return "blocked";
  return "pending";
}

function renderMetrics() {
  const departments = currentDepartments();
  const requirements = currentRequirements();
  const requiredDepartments = departments.filter(d => d.required);
  const approvedRequiredDepartments = requiredDepartments.filter(d => d.status === "APPROVED").length;
  const requiredRequirements = requirements.filter(r => r.required);
  const approvedRequiredRequirements = requiredRequirements.filter(r => r.status === "APPROVED").length;
  const openConflicts = state.resolved ? 0 : 1;

  const metrics = [
    [
      "Required departments",
      `${approvedRequiredDepartments}/${requiredDepartments.length}`,
      state.resolved ? "All required owners approved" : "Claims still needs clarification",
    ],
    [
      "Open blocking conflicts",
      openConflicts,
      openConflicts ? "1 conflict blocks progression" : "No blocking conflicts",
    ],
    [
      "Mandatory requirements",
      `${approvedRequiredRequirements}/${requiredRequirements.length}`,
      state.resolved ? "All mandatory requirements approved" : "Claims requirement still pending",
    ],
    [
      "Readiness",
      state.resolved ? "READY" : "BLOCKED",
      state.resolved ? "Eligible for delivery" : "Gate conditions not satisfied",
    ],
  ];

  document.getElementById("metricGrid").innerHTML = metrics.map(([label, value, note]) => `
    <div class="metric">
      <div class="metric-label">${label}</div>
      <div class="metric-value">${value}</div>
      <div class="metric-note">${note}</div>
    </div>`).join("");
}

function renderWorkflow() {
  const currentIndex = state.resolved ? workflowSteps.length : 2;
  document.getElementById("workflow").innerHTML = workflowSteps.map((step, index) => {
    let dotClass = "locked";
    let status = "Locked";
    let symbol = index + 1;
    if (state.resolved || index < currentIndex) {
      dotClass = "done";
      status = "Complete";
      symbol = "✓";
    } else if (!state.resolved && index === currentIndex) {
      dotClass = "current";
      status = "Needs action";
      symbol = "!";
    }
    return `
      <div class="workflow-step">
        <div class="step-dot ${dotClass}">${symbol}</div>
        <strong>${step}</strong>
        <div class="step-status">${status}</div>
      </div>`;
  }).join("");
}

function renderBlockers() {
  const container = document.getElementById("blockers");
  const button = document.getElementById("resolveDemoBtn");
  const title = document.getElementById("readinessPanelTitle");

  if (state.resolved) {
    title.textContent = "Why the project is ready";
    container.innerHTML = `
      <div class="blocker" style="background:var(--good-bg);border-color:#abefc6">
        <strong style="color:var(--good)">All mandatory blockers resolved</strong>
        <span style="color:#05603a">The authoritative Claims threshold is confirmed at $25,000, all 6 required departments approved, and all mandatory requirements are approved.</span>
      </div>`;
    button.textContent = "Reset demo";
  } else {
    title.textContent = "Why the project is blocked";
    container.innerHTML = `
      <div class="blocker">
        <strong>Claims threshold conflict</strong>
        <span>Claims SOP v3.1 and the Claims Manager state $25,000, while Claims Policy v2.1 states $20,000. Human clarification is required.</span>
      </div>
      <div class="blocker">
        <strong>Final approval unavailable</strong>
        <span>Cross-department and final approvals cannot complete while the blocking Claims conflict is open.</span>
      </div>`;
    button.textContent = "Simulate conflict resolution";
  }
}

function renderDepartments() {
  const departments = currentDepartments();
  document.getElementById("departmentGrid").innerHTML = departments.map(d => `
    <div class="mini-card">
      <div class="card-row">
        <div class="card-title">${d.name}</div>
        <span class="status-pill ${slugStatus(d.status)}">${d.status}</span>
      </div>
      <div class="card-meta">Owner: ${d.owner}<br>${d.required ? "Required for readiness" : "Advisory"}</div>
    </div>`).join("");
}

function renderQuestions() {
  document.getElementById("questionTable").innerHTML = state.questions.map(q => `
    <tr>
      <td><span class="status-pill ${q.priority === "CRITICAL" ? "critical" : "high"}">${q.priority}</span></td>
      <td>${q.department}</td>
      <td>${q.text}</td>
      <td>${q.owner}</td>
    </tr>`).join("");
}

function renderConflicts() {
  document.getElementById("conflictList").innerHTML = `
    <div class="conflict-card ${state.resolved ? "resolved" : ""}">
      <div class="conflict-title">
        <div>
          <div class="eyebrow">${state.resolved ? "Resolved" : "Blocking conflict"}</div>
          <h2>Automatic claim approval threshold</h2>
        </div>
        <span class="status-pill ${state.resolved ? "approved" : "critical"}">${state.resolved ? "RESOLVED" : "HIGH"}</span>
      </div>
      <p>${state.resolved ? "Claims Manager confirmed $25,000 as authoritative. Claims Policy v2.1 is superseded and tracked as a policy-update dependency." : "Sources disagree on the same business topic. Baspin does not select a value automatically."}</p>
      <div class="conflict-source">Claims SOP v3.1: $25,000 · Claims Manager: $25,000 · Claims Policy v2.1: $20,000</div>
    </div>`;
}

function renderRequirements() {
  const requirements = currentRequirements();
  document.getElementById("requirementTable").innerHTML = requirements.map(r => `
    <tr>
      <td><strong>${r.id}</strong></td>
      <td>${r.type}</td>
      <td>${r.department}</td>
      <td>${r.description}</td>
      <td><span class="status-pill ${slugStatus(r.status)}">${r.status}</span></td>
    </tr>`).join("");
}

function renderApprovals() {
  const approvals = [
    ["Claims Operations", state.resolved ? "APPROVED" : "NEEDS CLARIFICATION", "Claims Manager"],
    ["Finance", "APPROVED", "Finance Operations Manager"],
    ["Legal", "APPROVED", "Legal Counsel"],
    ["Cross-Department Review", state.resolved ? "APPROVED" : "PENDING", "Business Analyst"],
    ["Final Approval", state.resolved ? "APPROVED" : "PENDING", "Business Sponsor"],
  ];
  document.getElementById("approvalGrid").innerHTML = approvals.map(([name, status, owner]) => `
    <div class="mini-card">
      <div class="card-row">
        <div class="card-title">${name}</div>
        <span class="status-pill ${slugStatus(status)}">${status}</span>
      </div>
      <div class="card-meta">Human owner: ${owner}</div>
    </div>`).join("");
}

function renderOkf() {
  const lock = document.getElementById("okfLock");
  const preview = document.getElementById("okfPreview");
  if (!state.resolved) {
    lock.classList.remove("hidden");
    preview.textContent = "// OKF generation blocked\n// Reason: unresolved Claims threshold conflict and missing final approval";
    return;
  }

  lock.classList.add("hidden");
  const okf = {
    project: {
      id: "insurance-automated-claim-approval",
      name: "Automated Claim Approval",
      status: "APPROVED",
    },
    requirements: [
      {
        id: "REQ-CLAIMS-001",
        type: "BUSINESS_RULE",
        owner: "Claims Operations",
        process_step: "claim_decision",
        rule: "claim_amount <= 25000",
        sources: ["Claims SOP v3.1", "Claims Manager confirmation"],
      },
      {
        id: "REQ-FIN-001",
        type: "FINANCIAL_CONTROL",
        owner: "Finance",
        process_step: "payment_release",
        rule: "payment_amount > 15000 requires Finance authorization",
        sources: ["Finance Control Matrix"],
      },
      {
        id: "REQ-LEGAL-001",
        type: "COMPLIANCE_REQUIREMENT",
        owner: "Legal",
        process_step: "decision_audit",
        rule: "decision evidence retained for 7 years",
        sources: ["Legal Retention Policy"],
      },
    ],
    provenance: {
      final_approval: "APPROVED",
      consolidated_analysis_version: 1,
    },
  };
  preview.textContent = JSON.stringify(okf, null, 2);
}

function renderReadinessBadge() {
  const badge = document.getElementById("readinessBadge");
  badge.textContent = state.resolved ? "READY FOR DELIVERY" : "BLOCKED";
  badge.className = `readiness-badge ${state.resolved ? "ready" : "blocked"}`;
}

function renderAll() {
  renderMetrics();
  renderWorkflow();
  renderBlockers();
  renderDepartments();
  renderQuestions();
  renderConflicts();
  renderRequirements();
  renderApprovals();
  renderOkf();
  renderReadinessBadge();
}

async function checkBackendHealth() {
  if (config.mode !== "live" || !config.workflowApiBaseUrl) return;

  try {
    const response = await fetch(`${config.workflowApiBaseUrl.replace(/\/$/, "")}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const health = await response.json();
    console.info("Baspin workflow API connected", health);
  } catch (error) {
    console.warn("Baspin workflow API unavailable; dashboard remains in demo state.", error);
  }
}

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".page-section").forEach(section => section.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.section).classList.add("active");
  });
});

document.getElementById("resolveDemoBtn").addEventListener("click", () => {
  state.resolved = !state.resolved;
  renderAll();
});

renderAll();
checkBackendHealth();
