# Baspin — Product Definition & System Principles

## 1. Product Definition

Baspin is an AI-assisted business analysis and knowledge validation system that helps organizations collect, verify, consolidate, and structure cross-department business requirements before a project enters execution.

The system is designed around a human Business Analyst (BA). Baspin does not replace the BA and does not treat AI-generated conclusions as authoritative business truth. Instead, it supports the BA by generating context-aware questions, collecting answers and evidence, identifying missing information and contradictions, routing clarification requests to the relevant owners, recording approvals, and converting only validated knowledge into structured OKF.

Baspin's core operating model is a check-and-balance system:

- AI gathers and structures information.
- Department owners provide and validate domain knowledge.
- The Business Analyst reviews, consolidates, interprets, and manages the business analysis process.
- Critical information remains traceable to its source and approver.
- A project cannot move to execution while required approvals, clarifications, or critical conflicts remain unresolved.

The final outcome is a validated and traceable body of business knowledge that can be converted into OKF and used as an input to Agile, SDLC, product, engineering, operations, compliance, and other delivery processes.

---

## 2. Core Problem Baspin Solves

Business analysis often depends on information distributed across departments, employees, policies, legacy systems, documents, APIs, tickets, and undocumented operational knowledge.

This creates recurring problems:

- Different departments provide conflicting answers.
- Business rules are undocumented or outdated.
- Requirements lose their original source and context.
- Business Analysts are expected to reconcile information they do not own.
- Important assumptions can be mistaken for confirmed facts.
- Stakeholders may later dispute requirements they previously provided informally.
- Projects may enter development before legal, compliance, security, finance, technical, or operational dependencies are resolved.

Baspin is intended to make this process explicit, traceable, and auditable.

---

## 3. Product Goal

Baspin's goal is to create a reliable path from an initial business need to execution-ready, approved, structured organizational knowledge.

The system should help the Business Analyst answer five questions at all times:

1. What do we currently know?
2. Where did this information come from?
3. Who owns and approved this information?
4. What is still missing, ambiguous, contradictory, or risky?
5. Is the project genuinely ready to move into execution?

---

## 4. Human and AI Responsibility Model

### Business Analyst

The Business Analyst remains responsible for:

- defining business context and project scope;
- selecting or confirming relevant stakeholders;
- reviewing AI-generated questions;
- interpreting validated information;
- consolidating cross-department requirements;
- identifying business trade-offs and scope decisions;
- reviewing unresolved issues and risks;
- conducting final business analysis review;
- initiating the final project approval process.

The BA should not be forced to personally guarantee facts owned by another department.

### AI / Baspin Agents

AI is responsible for assisting with:

- generating department-specific questions;
- generating follow-up and clarification questions;
- organizing answers and supporting evidence;
- detecting missing information;
- identifying possible contradictions and inconsistencies;
- suggesting relevant stakeholders or information sources;
- maintaining provenance and approval metadata;
- presenting consolidated information to the BA;
- converting validated business knowledge into OKF.

AI must not silently promote an unverified answer into an approved requirement.

### Department Owners and Stakeholders

Department owners are responsible for:

- providing domain-specific information;
- reviewing information attributed to their area;
- correcting inaccurate or outdated information;
- resolving clarification requests;
- approving or rejecting requirements within their ownership area.

---

## 5. Check-and-Balance Principles

### Principle 1 — No Unowned Facts

Every material business rule, requirement, constraint, decision, or policy should have an identifiable source or owner whenever possible.

### Principle 2 — Human Confirmation for Critical Knowledge

Critical business information must be confirmed by an accountable human stakeholder before it becomes approved project knowledge.

### Principle 3 — Source and Approval Are Different

The person or system that originally supplied information is not automatically the final approver.

Example:

- Source: Claims Operations Specialist
- Business Rule: Claims over $25,000 require supervisor review
- Approver: Claims Manager
- Status: Approved

### Principle 4 — Contradictions Must Be Visible

Baspin must not silently choose between conflicting sources.

Example:

- Policy document: approval threshold = $20,000
- Claims department: approval threshold = $25,000

The system should create a conflict record, generate a clarification request, and route it to an appropriate owner.

### Principle 5 — Assumptions Are Explicit

Assumptions must remain distinguishable from confirmed facts.

Suggested statuses include:

- Draft
- Unverified
- Assumption
- Needs Clarification
- Conflicting
- Pending Approval
- Approved
- Rejected
- Superseded

### Principle 6 — The BA Is Protected by Provenance

Baspin should preserve enough provenance to answer:

- Who provided this information?
- From which system or document was it obtained?
- When was it provided?
- Who approved it?
- Which version was approved?
- Was it later changed or superseded?

### Principle 7 — No Execution Without Readiness

A project should not receive an execution-ready status while critical blockers remain unresolved.

---

## 6. High-Level Business Workflow

1. **Project Initiation and Business Context**
   - Define the business need.
   - Define scope and objectives.
   - Identify relevant departments and stakeholders.

2. **AI-Assisted Question Generation**
   - Generate department-specific questions.
   - Use project context and known organizational information.
   - Create follow-up questions dynamically as information is collected.

3. **Information Collection**
   - Collect stakeholder responses.
   - Retrieve relevant company documents, systems, policies, tickets, APIs, procedures, and other approved sources.
   - Record provenance for each material input.

4. **AI Analysis and Validation Support**
   - Identify missing information.
   - Detect inconsistencies and contradictions.
   - Detect unresolved dependencies and risks.
   - Generate clarification questions.

5. **Department Confirmation**
   - Route relevant findings back to responsible owners.
   - Obtain confirmation, correction, rejection, or clarification.
   - Record approval status and approver identity.

6. **Business Analyst Review and Consolidation**
   - Review validated inputs.
   - Consolidate cross-department knowledge.
   - Evaluate business logic, scope, dependencies, priorities, and trade-offs.

7. **Cross-Department Validation**
   - Share consolidated analysis across relevant departments.
   - Resolve remaining cross-functional conflicts.
   - Confirm alignment between business units.

8. **Final Approval**
   - Verify that all required critical departments have approved their areas.
   - Confirm legal, compliance, security, finance, operational, and technical dependencies where applicable.
   - Complete final BA review.

9. **OKF Conversion**
   - Convert validated and approved business knowledge into structured OKF.
   - Preserve provenance, ownership, approval, dependencies, and decision context.

10. **Project Readiness Gate**
    - Evaluate whether the project can enter execution.
    - Output either `READY FOR DELIVERY` or `BLOCKED` with explicit reasons.

---

## 7. Project Readiness Gate

The readiness gate is a core Baspin control, not a cosmetic status indicator.

A project may be marked `READY FOR DELIVERY` only when required checks pass.

Possible readiness dimensions include:

- Business Requirements
- Data Requirements
- Department Approvals
- Compliance
- Legal
- Security
- Finance
- Operational Readiness
- Technical Feasibility
- Dependencies
- Stakeholder Approval
- Critical Conflict Resolution

If a required check fails, Baspin should show the project as `BLOCKED` and explain the reason.

Example:

```text
PROJECT STATUS: BLOCKED

Reason:
Data retention requirements have not been approved by Legal.
```

---

## 8. Knowledge Traceability Model

A validated requirement should be traceable from its final form back to its origin.

Example:

```text
Requirement ID: REQ-CLM-001
Requirement: Claims above $25,000 require supervisor approval.
Department: Claims Operations
Source Type: Human Response
Source: Claims Operations Specialist
Evidence: Claims workflow interview / current SOP
Approver: Claims Manager
Approval Status: Approved
Approval Date: 2026-10-18
Version: 1.0
```

This traceability model is central to Baspin's value.

---

## 9. OKF Output Principles

Baspin should convert only validated business knowledge into final OKF output.

The structured output may include:

- Business Goals
- Actors and Stakeholders
- Business Processes
- Business Rules
- Decision Rules
- Data Requirements
- System Requirements
- Dependencies
- Exceptions
- Risks
- Compliance Constraints
- Ownership
- Evidence
- Approvals
- Provenance

Unresolved assumptions and conflicts should not be represented as approved facts.

---

## 10. Core Product Philosophy

> AI gathers and structures. Humans verify and approve. The Business Analyst remains accountable for the analysis, not for inventing the information.

Baspin should increase the quality and speed of business analysis without removing human ownership, accountability, or judgment.

The system succeeds when it makes business knowledge more accurate, more explainable, more traceable, and safer to use as the foundation for project execution.
