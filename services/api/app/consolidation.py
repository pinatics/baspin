import hashlib
from collections import defaultdict

from .consolidation_models import (
    ConsolidatedAnalysis,
    ConsolidationRequest,
    ConsolidationStatus,
    CrossDepartmentIssue,
    CrossDepartmentIssueType,
)


def consolidate_requirements(request: ConsolidationRequest) -> ConsolidatedAnalysis:
    approved = [r for r in request.requirements if r.approved]
    departments = sorted({r.department for r in approved})
    requirement_ids = [r.requirement_id for r in approved]

    missing_mandatory_departments = sorted(
        set(request.mandatory_departments) - set(departments)
    )

    issues: list[CrossDepartmentIssue] = []

    # Group by process step to surface cross-department interactions.
    by_step: dict[str, list] = defaultdict(list)
    for requirement in approved:
        key = (requirement.process_step or "unspecified").strip().lower()
        by_step[key].append(requirement)

    for process_step, requirements in by_step.items():
        if len(requirements) < 2:
            continue

        req_departments = sorted({r.department for r in requirements})
        if len(req_departments) < 2:
            continue

        normalized_descriptions = {
            " ".join(r.description.lower().split()) for r in requirements
        }

        # Exact/near duplicate wording across departments is treated as duplication.
        if len(normalized_descriptions) == 1:
            issues.append(
                _issue(
                    issue_type=CrossDepartmentIssueType.DUPLICATION,
                    description=(
                        f"Multiple departments define the same rule for process step "
                        f"'{process_step}'. Confirm a single business owner and source of truth."
                    ),
                    requirements=requirements,
                    blocking=False,
                    clarification_question=(
                        "Which department is the authoritative owner for this shared rule?"
                    ),
                )
            )
            continue

        # Different rules at the same process step are surfaced as a blocking conflict.
        issues.append(
            _issue(
                issue_type=CrossDepartmentIssueType.CONFLICT,
                description=(
                    f"Different approved requirements apply to the same process step "
                    f"'{process_step}' across departments."
                ),
                requirements=requirements,
                blocking=True,
                clarification_question=(
                    "How should these cross-department rules be reconciled for the shared process step?"
                ),
            )
        )

    # Detect explicit cross-step dependencies for requirements from different departments.
    for i, left in enumerate(approved):
        for right in approved[i + 1 :]:
            if left.department == right.department:
                continue
            if not left.process_step or not right.process_step:
                continue
            if left.process_step.strip().lower() == right.process_step.strip().lower():
                continue
            if _looks_related(left.description, right.description):
                issues.append(
                    _issue(
                        issue_type=CrossDepartmentIssueType.DEPENDENCY,
                        description=(
                            f"{left.department} requirement {left.requirement_id} and "
                            f"{right.department} requirement {right.requirement_id} appear to "
                            "form dependent steps in the same business flow."
                        ),
                        requirements=[left, right],
                        blocking=False,
                        clarification_question=None,
                    )
                )

    if missing_mandatory_departments:
        status = ConsolidationStatus.BLOCKED
        ready = False
    elif any(issue.blocking for issue in issues):
        status = ConsolidationStatus.NEEDS_CLARIFICATION
        ready = False
    else:
        status = ConsolidationStatus.READY_FOR_FINAL_APPROVAL
        ready = True

    summary = (
        f"Consolidated {len(approved)} approved requirement(s) from "
        f"{len(departments)} department(s); found {len(issues)} cross-department issue(s)."
    )

    return ConsolidatedAnalysis(
        project_id=request.project_id,
        status=status,
        requirement_ids=requirement_ids,
        departments=departments,
        issues=issues,
        missing_mandatory_departments=missing_mandatory_departments,
        summary=summary,
        ready_for_final_approval=ready,
    )


def _looks_related(left: str, right: str) -> bool:
    stop = {
        "the",
        "and",
        "for",
        "with",
        "must",
        "requires",
        "required",
        "claim",
        "claims",
        "approval",
        "approved",
    }
    left_words = {
        w.strip(".,:;()$%").lower()
        for w in left.split()
        if len(w.strip(".,:;()$%")) >= 5
    } - stop
    right_words = {
        w.strip(".,:;()$%").lower()
        for w in right.split()
        if len(w.strip(".,:;()$%")) >= 5
    } - stop
    return len(left_words & right_words) >= 1


def _issue(*, issue_type, description, requirements, blocking, clarification_question):
    ids = sorted(r.requirement_id for r in requirements)
    departments = sorted({r.department for r in requirements})
    digest = hashlib.sha1(
        f"{issue_type.value}:{'|'.join(ids)}:{description}".encode()
    ).hexdigest()[:10]
    return CrossDepartmentIssue(
        id=f"XDI-{digest}",
        issue_type=issue_type,
        description=description,
        requirement_ids=ids,
        departments=departments,
        blocking=blocking,
        clarification_question=clarification_question,
    )
