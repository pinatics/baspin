window.BASPIN_CONFIG = {
  mode: "live",
  workflowApiBaseUrl: "https://baspin-api.onrender.com",
  agentsApiBaseUrl: "https://baspin-agents.onrender.com",
};

window.addEventListener("DOMContentLoaded", () => {
  const legacySteps = document.createElement("script");
  legacySteps.src = "./app-demo-process-steps.js?v=3";
  legacySteps.onload = () => {
    const completion = document.createElement("script");
    completion.src = "./app-completion.js?v=3";
    completion.onload = () => {
      const watcher = document.createElement("script");
      watcher.src = "./app-completion-watcher.js?v=3";
      watcher.onload = () => {
        const overview = document.createElement("script");
        overview.src = "./app-overview-live.js?v=1";
        document.body.appendChild(overview);
      };
      document.body.appendChild(watcher);
    };
    document.body.appendChild(completion);
  };
  document.body.appendChild(legacySteps);
});
