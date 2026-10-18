# Baspin Agents

AI-specific reasoning and transformation layer.

## MVP Agents

### Question Agent
Generates department-specific questions and targeted follow-ups from project context and known evidence.

### Validation Agent
Finds missing information, ambiguity, unsupported claims, contradictions, and cross-department dependencies.

### Requirement Normalization Agent
Transforms validated answers and evidence into structured candidate requirements while preserving ownership and provenance.

### OKF Conversion Agent
Transforms final-approved knowledge into schema-valid OKF.

### Readiness Agent
Explains readiness results from deterministic checks. It may summarize blockers, but it does not override the workflow engine.

## Hard Boundary

Agents may generate, compare, classify, summarize, and recommend.

Agents may not:
- approve their own outputs
- silently resolve business conflicts
- invent missing company facts
- bypass a required department owner
- mark a project READY without deterministic gate checks
