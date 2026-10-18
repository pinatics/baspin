import pytest

from app.approval_models import (
    ApprovalDecision,
    ApprovalDecisionRequest,
    ApprovalRevalidationRequest,
    DepartmentReviewPackage,
    RequirementSnapshot,
)
from app.approvals import decide_department_review, revalidate_approval


def _package(open_conflicts=None):
    return DepartmentReviewPackage(
        id="PKG-CLAIMS-001",
        project_id="automated-claim-approval",
        department="Claims Operations",
        reviewer="Claims Manager",
        requirements=[
            RequirementSnapshot(
                requirement_id="REQ-CLAIMS-001",
                version=1,
                title="Automatic claim approval threshold",
                description="Eligible claims up to $25,000 may be automatically approved.",
                owner="Claims Manager",
                department="Claims Operations",
            )
        ],
        open_conflict_ids=open_conflicts or [],
    )


def test_open_conflict_blocks_department_approval():
    request = ApprovalDecisionRequest(
        package=_package(["C-001"]),
        decision=ApprovalDecision.APPROVED,
        approver="Claims Manager",
    )

    with pytest.raises(ValueError):
        decide_department_review(request)


def test_approval_records_requirement_versions():
    request = ApprovalDecisionRequest(
        package=_package(),
        decision=ApprovalDecision.APPROVED,
        approver="Claims Manager",
        comment="Approved for department review.",
    )

    response = decide_department_review(request)

    assert response.package_status.value == "APPROVED"
    assert response.approval.requirement_versions == {"REQ-CLAIMS-001": 1}
    assert response.approval.decision == ApprovalDecision.APPROVED


def test_material_version_change_invalidates_old_approval():
    approval = decide_department_review(
        ApprovalDecisionRequest(
            package=_package(),
            decision=ApprovalDecision.APPROVED,
            approver="Claims Manager",
        )
    ).approval

    result = revalidate_approval(
        ApprovalRevalidationRequest(
            approval=approval,
            current_requirement_versions={"REQ-CLAIMS-001": 2},
        )
    )

    assert result.remains_valid is False
    assert result.stale_requirement_ids == ["REQ-CLAIMS-001"]
    assert result.reason is not None
