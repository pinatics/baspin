(() => {
  const mappings = {
    "REQ-CLAIMS-001": { factId: "DEMO-CLAIMS-FACT", processStep: "claim_decision" },
    "REQ-FIN-001": { factId: "DEMO-FIN-FACT", processStep: "payment_release" },
    "REQ-LEGAL-001": { factId: "DEMO-LEGAL-FACT", processStep: "decision_audit" },
  };

  if (!Array.isArray(state.requirements)) return;
  if (!Array.isArray(state.answers)) state.answers = [];

  for (const requirement of state.requirements) {
    const mapping = mappings[requirement.id];
    if (!mapping) continue;

    if (!Array.isArray(requirement.source_fact_ids) || !requirement.source_fact_ids.length) {
      requirement.source_fact_ids = [mapping.factId];
    }

    if (!state.answers.some(answer => answer.id === mapping.factId)) {
      state.answers.push({
        id: mapping.factId,
        processStep: mapping.processStep,
        validationStatus: "VALIDATED",
        department: requirement.department,
        topic: requirement.id,
        value: requirement.description || "",
        sourceName: "Legacy demo requirement metadata",
      });
    }
  }
})();
