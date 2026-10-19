(() => {
  let lastSignature = "";
  let busy = false;

  function hasState() {
    return typeof state !== "undefined";
  }

  function signature() {
    const approvals = (state.departmentApprovals || []).map(item => [
      item.requirementId,
      item.requirementVersion,
      item.packageStatus,
      item.active,
      item.stale,
      item.approval?.id || "",
    ].join(":"));
    const reqs = (state.requirements || []).map(req => `${req.id}:v${req.version || 1}:${req.status || ""}`);
    return [...approvals, ...reqs].sort().join("|");
  }

  async function tick() {
    if (busy || typeof window.refreshCompletionFlow !== "function" || !hasState()) return;
    const next = signature();
    if (!next || next === lastSignature) return;
    lastSignature = next;
    busy = true;
    try {
      await window.refreshCompletionFlow();
    } catch (error) {
      console.warn("Completion refresh watcher failed", error);
    } finally {
      busy = false;
    }
  }

  setInterval(tick, 700);
  setTimeout(tick, 1200);
})();
