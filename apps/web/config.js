window.BASPIN_CONFIG = {
  mode: "live",
  workflowApiBaseUrl: "https://baspin-api.onrender.com",
  agentsApiBaseUrl: "https://baspin-agents.onrender.com",
};

window.addEventListener("DOMContentLoaded", () => {
  const completion = document.createElement("script");
  completion.src = "./app-completion.js?v=1";
  completion.onload = () => {
    const watcher = document.createElement("script");
    watcher.src = "./app-completion-watcher.js?v=1";
    document.body.appendChild(watcher);
  };
  document.body.appendChild(completion);
});
