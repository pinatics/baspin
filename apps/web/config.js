window.BASPIN_CONFIG = {
  mode: "live",
  workflowApiBaseUrl: "https://baspin-api.onrender.com",
  agentsApiBaseUrl: "https://baspin-agents.onrender.com",
};

window.addEventListener("DOMContentLoaded", () => {
  const legacySteps = document.createElement("script");
  legacySteps.src = "./app-demo-process-steps.js?v=2";
  legacySteps.onload = () => {
    const completion = document.createElement("script");
    completion.src = "./app-completion.js?v=2";
    completion.onload = () => {
      const watcher = document.createElement("script");
      watcher.src = "./app-completion-watcher.js?v=2";
      document.body.appendChild(watcher);
    };
    document.body.appendChild(completion);
  };
  document.body.appendChild(legacySteps);
});
