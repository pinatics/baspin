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

  if (!addButton || !editor) return;

  function ensureQuestionMetadata(question) {
    if (!question.type) question.type = "INITIAL";
    if (!question.source) question.source = "AI Generated";
    if (typeof question.editedByBA !== "boolean") question.editedByBA = false;
    if (!question.related) question.related = "";
    return question;
  }

  state.questions = state.questions.map(ensureQuestionMetadata);

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

  window.renderQuestions = function renderQuestionsEditable() {
    state.questions = state.questions.map(ensureQuestionMetadata);
    document.getElementById("questionTable").innerHTML = state.questions.map((q, index) => {
      const sourceLabel = q.source === "BA Added" ? "BA Added" : (q.editedByBA ? "AI Generated · edited by BA" : "AI Generated");
      return `
        <tr>
          <td><span class="status-pill ${q.priority === "CRITICAL" ? "critical" : q.priority === "HIGH" ? "high" : "pending"}">${q.priority}</span></td>
          <td>${q.department || "—"}</td>
          <td>${q.text}</td>
          <td>${q.owner || "—"}</td>
          <td>${q.type || "INITIAL"}</td>
          <td><span class="source-pill ${q.source === "BA Added" ? "ba" : "ai"}">${sourceLabel}</span></td>
          <td><button class="link-btn question-edit-btn" type="button" data-index="${index}">Edit</button></td>
        </tr>`;
    }).join("");

    document.querySelectorAll(".question-edit-btn").forEach(button => {
      button.addEventListener("click", () => {
        const index = Number(button.dataset.index);
        showEditor(state.questions[index], index);
      });
    });
  };

  addButton.addEventListener("click", () => showEditor());
  cancelButton.addEventListener("click", hideEditor);

  editor.addEventListener("submit", event => {
    event.preventDefault();

    const indexValue = editIndex.value;
    const existing = indexValue !== "" ? state.questions[Number(indexValue)] : null;

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
    });

    if (indexValue === "") {
      state.questions.push(updatedQuestion);
    } else {
      state.questions[Number(indexValue)] = updatedQuestion;
    }

    renderQuestions();
    hideEditor();
  });

  renderQuestions();
})();
