from app.final_approval import record_final_approval
from app.final_approval_models import FinalApprovalDecision, FinalApprovalRequest


def test_final_approval_marks_project_approved_for_okf():
    response = record_final_approval(
        FinalApprovalRequest(
            project_id="insurance-001",
            consolidated_analysis_id="CA-001",
            consolidated_analysis_version=1,
            decision=FinalApprovalDecision.APPROVED,
            approver="Program Sponsor",
            role="Executive Sponsor",
        )
    )

    assert response.approved_for_okf is True
    assert response.approval.decision == FinalApprovalDecision.APPROVED


def test_non_approved_decision_does_not_allow_okf():
    response = record_final_approval(
        FinalApprovalRequest(
            project_id="insurance-001",
            consolidated_analysis_id="CA-001",
            consolidated_analysis_version=1,
            decision=FinalApprovalDecision.NEEDS_CLARIFICATION,
            approver="Program Sponsor",
            role="Executive Sponsor",
        )
    )

    assert response.approved_for_okf is False
