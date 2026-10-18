from app.consolidation import consolidate_requirements
from app.consolidation_models import (
    ApprovedRequirement,
    ConsolidationRequest,
    ConsolidationStatus,
    CrossDepartmentIssueType,
)


def req(
    requirement_id: str,
    department: str,
    description: str,
    process_step: str,
) -> ApprovedRequirement:
    return ApprovedRequirement(
        requirement_id=requirement_id,
        version=1,
        title=requirement_id,
        description=description,
        requirement_type="BUSINESS_RULE",
        department=department,
        owner=f"{department} Owner",
        process_step=process_step,
        source_ids=[f"SRC-{requirement_id}"],
        approval_id=f"APR-{requirement_id}",
        approved=True,
    )


def test_missing_mandatory_department_blocks_project():
    request = ConsolidationRequest(
        project_id="insurance-001",
        mandatory_departments=["Claims", "Finance", "Legal"],
        requirements=[
            req(
                "REQ-CLAIMS-001",
                "Claims",
                "Eligible claims may be automatically approved up to $25,000.",
                "claim_decision",
            ),
            req(
                "REQ-FIN-001",
                "Finance",
                "Payments above $15,000 require Finance authorization.",
                "payment_release",
            ),
        ],
    )

    result = consolidate_requirements(request)

    assert result.status == ConsolidationStatus.BLOCKED
    assert result.ready_for_final_approval is False
    assert result.missing_mandatory_departments == ["Legal"]


def test_different_rules_same_process_step_need_clarification():
    request = ConsolidationRequest(
        project_id="insurance-001",
        mandatory_departments=["Claims", "Finance"],
        requirements=[
            req(
                "REQ-CLAIMS-001",
                "Claims",
                "Claims up to $25,000 may be approved automatically.",
                "claim_decision",
            ),
            req(
                "REQ-FIN-001",
                "Finance",
                "Claims above $15,000 require Finance approval before decision.",
                "claim_decision",
            ),
        ],
    )

    result = consolidate_requirements(request)

    assert result.status == ConsolidationStatus.NEEDS_CLARIFICATION
    assert result.ready_for_final_approval is False
    assert any(
        issue.issue_type == CrossDepartmentIssueType.CONFLICT and issue.blocking
        for issue in result.issues
    )


def test_clean_cross_department_package_is_ready_for_final_approval():
    request = ConsolidationRequest(
        project_id="insurance-001",
        mandatory_departments=["Claims", "Finance", "Legal"],
        requirements=[
            req(
                "REQ-CLAIMS-001",
                "Claims",
                "Eligible claims may be automatically approved up to $25,000.",
                "claim_decision",
            ),
            req(
                "REQ-FIN-001",
                "Finance",
                "Payment release above $15,000 requires Finance authorization.",
                "payment_release",
            ),
            req(
                "REQ-LEGAL-001",
                "Legal",
                "Decision evidence must be retained for seven years.",
                "audit_retention",
            ),
        ],
    )

    result = consolidate_requirements(request)

    assert result.status == ConsolidationStatus.READY_FOR_FINAL_APPROVAL
    assert result.ready_for_final_approval is True
    assert result.missing_mandatory_departments == []
