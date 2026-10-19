(() => {
  const config = window.BASPIN_CONFIG || {};
  const form = document.getElementById("newProjectForm");
  if (!form) return;

  const agentsBase = (config.agentsApiBaseUrl || "").replace(/\/$/, "");
  const statusEl = document.getElementById("newProjectStatus");
  const submitBtn = document.getElementById("createProjectBtn");

  function slugify(value) {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function parseDepartments(raw) {
    return raw.split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [namePart, ...ownerParts] = line.split("|");
        return {
          name: namePart.trim(),
          owner: ownerParts.join("|").trim() || "Department Owner",
          status: "PENDING",
          required: true,
        };
      })
      .filter(item => item.name);
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

  function activateSection(id) {
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.section === id));
    document.querySelectorAll(".page-section").forEach(section => section.classList.toggle("active", section.id === id));
  }

  function renderCollectingProject(project, departments, questions) {
    state.resolved = false;
    state.currentProject = project;
    state.departments = departments;
    state.questions = questions;
    state.answers = [];
    state.validationFindings = [];
    state.requirements = [];

    document.getElementById("projectTitle").textContent = project.name;
    document.getElementById("projectGoal").textContent = project.goal;
    document.getElementById("projectEyebrow").textContent = project.industry;
    document.getElementById("sidebarProjectName").textContent = project.name;

    const badge = document.getElementById("readinessBadge");
    badge.textContent = "COLLECTING";
    badge.className = "readiness-badge collecting";

    document.getElementById("metricGrid").innerHTML = [
      ["Required departments", `0/${departments.length}`, "Awaiting department responses"],
      ["Generated questions", questions.length, "Created by the live Question Agent"],
      ["Validated requirements", "0", "Validation begins after responses arrive"],
      ["Readiness", "COLLECTING", "Project discovery is in progress"],
    ].map(([label, value, note]) => `
      <div class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div>
    `).join("");

    document.getElementById("workflow").innerHTML = workflowSteps.map((step, index) => {
      const done = index === 0;
      const current = index === 1;
      const dotClass = done ? "done" : current ? "current" : "locked";
      const symbol = done ? "✓" : current ? "!" : index + 1;
      const label = done ? "Complete" : current ? "In progress" : "Locked";
      return `<div class="workflow-step"><div class="step-dot ${dotClass}">${symbol}</div><strong>${step}</strong><div class="step-status">${label}</div></div>`;
    }).join("");

    document.getElementById("readinessPanelTitle").textContent = "What happens next";
    document.getElementById("blockers").innerHTML = `
      <div class="blocker neutral-blocker"><strong>Collect department responses and evidence</strong><span>Baspin generated ${questions.length} questions across ${departments.length} required departments. The next gate is evidence collection and validation.</span></div>
    `;
    const liveButton = document.getElementById("resolveDemoBtn");
    liveButton.textContent = "Waiting for department responses";
    liveButton.disabled = true;

    renderDepartments();
    renderQuestions();
    if (window.renderAnswers) window.renderAnswers();

    document.getElementById("conflictList").innerHTML = `<div class="mini-card"><div class="card-title">No conflicts evaluated yet</div><div class="card-meta">Conflicts will appear after department answers and evidence are validated.</div></div>`;
    document.getElementById("requirementTable").innerHTML = `<tr><td colspan="5">No normalized requirements yet. Validation must happen first.</td></tr>`;
    document.getElementById("approvalGrid").innerHTML = departments.map(d => `<div class="mini-card"><div class="card-row"><div class="card-title">${d.name}</div><span class="status-pill pending">PENDING</span></div><div class="card-meta">Human owner: ${d.owner}</div></div>`).join("");
    document.getElementById("okfLock").classList.remove("hidden");
    document.getElementById("okfPreview").textContent = "// OKF generation locked\n// Reason: project is still collecting department knowledge";
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const project = {
      name: document.getElementById("newProjectName").value.trim(),
      industry: document.getElementById("newProjectIndustry").value.trim(),
      goal: document.getElementById("newProjectGoal").value.trim(),
      scope: document.getElementById("newProjectScope").value.trim(),
    };
    project.id = slugify(project.name) || `project-${Date.now()}`;

    const departments = parseDepartments(document.getElementById("newProjectDepartments").value);
    if (!departments.length) {
      statusEl.textContent = "Add at least one department.";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Generating questions…";
    statusEl.textContent = "Calling Baspin Question Agent for each department.";

    try {
      const results = await Promise.all(departments.map(department => postJson(`${agentsBase}/questions/generate`, {
        project_id: project.id,
        project_name: project.name,
        business_goal: project.goal,
        scope: project.scope || null,
        department: department.name,
        department_role: department.owner,
        known_facts: [],
        open_issues: [],
        max_questions: 8,
      })));

      const questions = results.flatMap((result, index) => (result.questions || []).map(question => ({
        id: question.id,
        priority: question.priority,
        department: departments[index].name,
        text: question.text,
        owner: question.expected_owner || departments[index].owner,
        type: question.question_type || "INITIAL",
        related: question.related_issue || "",
        source: "AI Generated",
        editedByBA: false,
      })));

      renderCollectingProject(project, departments, questions);
      statusEl.textContent = `${questions.length} live questions generated.`;
      activateSection("questions");
    } catch (error) {
      statusEl.textContent = `Could not create project: ${error.message || error}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create project & generate questions";
    }
  });
})();
