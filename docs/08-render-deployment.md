# Render Deployment

Baspin uses two FastAPI services and a GitHub Pages frontend.

## Services

### baspin-api
- Root directory: `services/api`
- Build command: `pip install -e .`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

### baspin-agents
- Root directory: `services/agents`
- Build command: `pip install -e .`
- Start command: `uvicorn baspin_agents.api:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

The root `render.yaml` defines both services as a Render Blueprint.

## Frontend

The GitHub Pages frontend remains at:

`https://pinatics.github.io/baspin/`

After Render creates the two services, copy their public HTTPS URLs into `apps/web/config.js`:

```js
window.BASPIN_CONFIG = {
  mode: "api",
  apiBaseUrl: "https://<baspin-api>.onrender.com",
  agentsBaseUrl: "https://<baspin-agents>.onrender.com",
};
```

GitHub Pages will redeploy automatically after that commit.

## Smoke tests

Open these in a browser after deploy:

- `https://<baspin-api>.onrender.com/health`
- `https://<baspin-agents>.onrender.com/health`

Both should return:

```json
{"status":"ok"}
```
