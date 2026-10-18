import hashlib

from .final_approval_models import (
    FinalApprovalDecision,
    FinalApprovalRecord,
    FinalApprovalRequest,
    FinalApprovalResponse,
)


def record_final_approval(request: FinalApprovalRequest) -> FinalApprovalResponse:
    seed = (
        f"{request.project_id}:{request.consolidated_analysis_id}:"
        f"{request.consolidated_analysis_version}:{request.approver}:"
        f"{request.decision.value}"
    )
    approval_id = "FAPR-" + hashlib.sha1(seed.encode()).hexdigest()[:12]

    record = FinalApprovalRecord(
        id=approval_id,
        project_id=request.project_id,
        consolidated_analysis_id=request.consolidated_analysis_id,
        consolidated_analysis_version=request.consolidated_analysis_version,
        decision=request.decision,
        approver=request.approver,
        role=request.role,
        comment=request.comment,
    )

    return FinalApprovalResponse(
        approval=record,
        approved_for_okf=request.decision == FinalApprovalDecision.APPROVED,
    )
