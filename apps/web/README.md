# Baspin Web

Business Analyst and stakeholder-facing web application.

## Current Prototype

The current MVP is a static HTML/CSS/JavaScript dashboard designed to be easy to run locally and publish with GitHub Pages.

Files:

- `index.html` — dashboard shell and sections
- `styles.css` — responsive dashboard styling
- `app.js` — interactive insurance demo state

## Demo Behavior

The UI starts in a realistic blocked state for the Automated Claim Approval use case:

- Claims threshold conflict is open
- Claims department requires clarification
- cross-department review and final approval are not complete
- OKF generation is locked
- project readiness is `BLOCKED`

Click **Simulate conflict resolution** to model the human resolution of the Claims threshold conflict. The dashboard then updates to show:

- Claims approved
- no blocking conflict
- cross-department review approved
- final approval approved
- OKF preview unlocked
- `READY FOR DELIVERY`

This interaction is a frontend demo. The production version will replace local demo state with API calls to the Baspin backend and agent services.

## MVP Screens

1. Project Overview / Readiness
2. Department Status
3. Generated Questions
4. Conflicts / Clarifications
5. Normalized Requirements
6. Human Approvals
7. OKF Preview

## Local Run

Because the prototype is static, it can be opened directly in a browser or served with any static HTTP server.

Example from the repository root:

```bash
python -m http.server 8000 --directory apps/web
```

Then open `http://localhost:8000`.

## GitHub Pages

For the prototype, GitHub Pages can publish the contents of `apps/web` after the repository's Pages deployment workflow is configured.

A later step will add the deployment workflow and connect the dashboard to the real API.

## UI Principle

The UI must make uncertainty visible. Users should be able to distinguish approved, pending, disputed, superseded, AI-generated, and human-confirmed information at a glance.
