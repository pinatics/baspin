# Baspin Repository Structure

Baspin is organized as a monorepo so the product UI, backend API, agent logic, schemas, and realistic examples can evolve together without mixing responsibilities.

```text
baspin/
├── README.md
├── docs/
│   ├── 01-product-definition.md
│   ├── 02-system-architecture.md
│   ├── 03-data-model.md
│   ├── 04-workflow-state-machine.md
│   ├── 05-insurance-use-case.md
│   ├── 06-agent-contracts.md
│   └── 07-repo-structure.md
├── apps/
│   └── web/
│       └── README.md
├── services/
│   ├── api/
│   │   └── README.md
│   └── agents/
│       └── README.md
├── schemas/
│   ├── README.md
│   └── okf-project.schema.json
├── examples/
│   └── insurance/
│       └── automated-claim-approval.json
└── tests/
    └── README.md
```

## Responsibility Boundaries

### `apps/web`
Business Analyst and stakeholder-facing UI.

Initial responsibilities:
- project creation
- project status dashboard
- department progress
- question and answer review
- conflicts and clarifications
- approval status
- readiness gate

### `services/api`
Deterministic application backend and workflow orchestration.

Initial responsibilities:
- project and department state
- question/answer persistence
- approvals
- workflow state transitions
- provenance records
- readiness computation
- agent invocation

### `services/agents`
AI-specific logic.

Initial agent modules:
- Question Agent
- Validation Agent
- Requirement Normalization Agent
- OKF Conversion Agent
- Readiness Agent

Important: agents recommend and structure; they do not self-approve business truth.

### `schemas`
Machine-readable contracts for Baspin objects and OKF outputs.

The first schema focuses on the approved project-level OKF representation. Additional JSON Schemas can later cover requirements, conflicts, approvals, questions, and agent outputs.

### `examples`
Realistic test scenarios used for demos and automated tests.

The first example is the Automated Claim Approval insurance scenario.

### `tests`
Cross-cutting acceptance and workflow tests.

The most important tests are not only code tests; they should verify governance behavior such as:
- unresolved critical conflict prevents readiness
- missing mandatory approval prevents readiness
- material requirement change invalidates affected approval
- OKF cannot finalize from unapproved requirements
- provenance remains attached to normalized requirements

## MVP Technical Direction

Suggested first implementation:

- Frontend: lightweight web application
- API: Python + FastAPI
- Data models: Pydantic
- Persistence for local prototype: SQLite
- Agent interface: provider-agnostic Python service layer
- Structured agent outputs: JSON validated against schemas
- Production database later: PostgreSQL

The architecture should keep the AI provider replaceable and keep approval/workflow rules deterministic outside the LLM.
