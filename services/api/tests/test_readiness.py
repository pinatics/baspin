from app.models import (
    ApprovalInput,
    CheckStatus,
    ConflictInput,
    ReadinessCheckInput,
    ReadinessEvaluationRequest,
)
from app.readiness import evaluate_readiness


def test_project_is_blocked_when_critical_items_are_open():
    request = ReadinessEvaluationRequest(
        project_id="automated-claim-approval",
        checks=[
            ReadinessCheckInput(
                check_type="Business Requirements",
                status=CheckStatus.PASS,
            ),
            ReadinessCheckInput(
                check_type="Compliance",
                status=CheckStatus.PENDING,
                owner="Compliance",
                blocking_reason="Jurisdiction rule is not confirmed.",
            ),
        ],
        conflicts=[
            ConflictInput(
                id="C-001",
                severity="High",
                status="Open",
                owner="Claims Operations",
                description="Claims threshold conflict is unresolved.",
            )
        ],
        approvals=[
            ApprovalInput(
                id="APR-LEGAL",
                target_type="department_package",
                decision="Approved",
            ),
            ApprovalInput(
                id="APR-COMPLIANCE",
                target_type="department_package",
                decision="Pending",
                approver="Compliance Officer",
            ),
        ],
    )

    result = evaluate_readiness(request)

    assert result.status.value == "BLOCKED"
    assert len(result.blockers) == 3
    assert "Business Requirements" in result.passed_checks


def test_project_is_ready_when_all_mandatory_conditions_pass():
    request = ReadinessEvaluationRequest(
        project_id="automated-claim-approval",
        checks=[
            ReadinessCheckInput(
                check_type="Business Requirements",
                status=CheckStatus.PASS,
            ),
            ReadinessCheckInput(
                check_type="Compliance",
                status=CheckStatus.PASS,
            ),
            ReadinessCheckInput(
                check_type="Finance",
                status=CheckStatus.PASS,
            ),
        ],
        conflicts=[
            ConflictInput(
                id="C-001",
                severity="High",
                status="Resolved",
            )
        ],
        approvals=[
            ApprovalInput(
                id="APR-LEGAL",
                target_type="department_package",
                decision="Approved",
            ),
            ApprovalInput(
                id="APR-COMPLIANCE",
                target_type="department_package",
                decision="Approved",
            ),
        ],
    )

    result = evaluate_readiness(request)

    assert result.status.value == "READY_FOR_DELIVERY"
    assert result.blockers == []
