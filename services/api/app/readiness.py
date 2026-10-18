from .models import (
    BlockingItem,
    ProjectReadinessStatus,
    ReadinessEvaluationRequest,
    ReadinessEvaluationResponse,
)


CRITICAL_CONFLICT_SEVERITIES = {"critical", "high"}
OPEN_CONFLICT_STATUSES = {"open", "under_review", "waiting_for_clarification"}
NON_APPROVED_DECISIONS = {"rejected", "needs_clarification", "pending"}


def evaluate_readiness(request: ReadinessEvaluationRequest) -> ReadinessEvaluationResponse:
    blockers: list[BlockingItem] = []
    passed_checks: list[str] = []

    for check in request.checks:
        if check.status.value == "PASS" or check.status.value == "NOT_APPLICABLE":
            passed_checks.append(check.check_type)
            continue

        if check.required:
            reason = check.blocking_reason or f"Required readiness check is {check.status.value}."
            blockers.append(
                BlockingItem(
                    type="readiness_check",
                    reference=check.check_type,
                    reason=reason,
                    owner=check.owner,
                )
            )

    for conflict in request.conflicts:
        severity = conflict.severity.strip().lower()
        status = conflict.status.strip().lower().replace(" ", "_")

        if severity in CRITICAL_CONFLICT_SEVERITIES and status in OPEN_CONFLICT_STATUSES:
            blockers.append(
                BlockingItem(
                    type="conflict",
                    reference=conflict.id,
                    reason=conflict.description or "Critical conflict remains unresolved.",
                    owner=conflict.owner,
                )
            )

    for approval in request.approvals:
        decision = approval.decision.strip().lower().replace(" ", "_")
        if approval.mandatory and decision in NON_APPROVED_DECISIONS:
            blockers.append(
                BlockingItem(
                    type="approval",
                    reference=approval.id,
                    reason=f"Mandatory approval decision is {approval.decision}.",
                    owner=approval.approver,
                )
            )

    status = (
        ProjectReadinessStatus.BLOCKED
        if blockers
        else ProjectReadinessStatus.READY
    )

    return ReadinessEvaluationResponse(
        project_id=request.project_id,
        status=status,
        blockers=blockers,
        passed_checks=passed_checks,
    )
