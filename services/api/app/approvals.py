import hashlib

from .approval_models import (
    ApprovalDecision,
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ApprovalRecord,
    ApprovalRevalidationRequest,
    ApprovalRevalidationResponse,
    ReviewPackageStatus,
)


def decide_department_review(request: ApprovalDecisionRequest) -> ApprovalDecisionResponse:
    package = request.package

    if package.open_conflict_ids and request.decision == ApprovalDecision.APPROVED:
        raise ValueError("A department package with open conflicts cannot be approved.")

    package_status = {
        ApprovalDecision.APPROVED: ReviewPackageStatus.APPROVED,
        ApprovalDecision.REJECTED: ReviewPackageStatus.REJECTED,
        ApprovalDecision.NEEDS_CLARIFICATION: ReviewPackageStatus.NEEDS_CLARIFICATION,
    }[request.decision]

    requirement_versions = {
        requirement.requirement_id: requirement.version
        for requirement in package.requirements
    }

    seed = (
        f"{package.project_id}:{package.id}:{request.approver}:"
        f"{request.decision.value}:{sorted(requirement_versions.items())}"
    )
    approval_id = "APR-" + hashlib.sha1(seed.encode()).hexdigest()[:12]

    approval = ApprovalRecord(
        id=approval_id,
        project_id=package.project_id,
        package_id=package.id,
        department=package.department,
        approver=request.approver,
        decision=request.decision,
        comment=request.comment,
        requirement_versions=requirement_versions,
    )

    return ApprovalDecisionResponse(
        package_status=package_status,
        approval=approval,
    )


def revalidate_approval(request: ApprovalRevalidationRequest) -> ApprovalRevalidationResponse:
    stale_requirement_ids: list[str] = []

    for requirement_id, approved_version in request.approval.requirement_versions.items():
        current_version = request.current_requirement_versions.get(requirement_id)
        if current_version is None or current_version != approved_version:
            stale_requirement_ids.append(requirement_id)

    remains_valid = request.approval.active and not stale_requirement_ids
    reason = None

    if not request.approval.active:
        reason = request.approval.superseded_reason or "Approval is no longer active."
    elif stale_requirement_ids:
        reason = (
            "One or more material requirement versions changed after approval; "
            "human re-approval is required."
        )

    return ApprovalRevalidationResponse(
        approval_id=request.approval.id,
        remains_valid=remains_valid,
        stale_requirement_ids=stale_requirement_ids,
        reason=reason,
    )
