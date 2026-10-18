from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class FinalApprovalDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"


class FinalApprovalRequest(BaseModel):
    project_id: str
    consolidated_analysis_id: str
    consolidated_analysis_version: int = Field(ge=1)
    decision: FinalApprovalDecision
    approver: str
    role: str
    comment: Optional[str] = None


class FinalApprovalRecord(BaseModel):
    id: str
    project_id: str
    consolidated_analysis_id: str
    consolidated_analysis_version: int
    decision: FinalApprovalDecision
    approver: str
    role: str
    comment: Optional[str] = None
    active: bool = True


class FinalApprovalResponse(BaseModel):
    approval: FinalApprovalRecord
    approved_for_okf: bool
