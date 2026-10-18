from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CheckStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class ProjectReadinessStatus(str, Enum):
    READY = "READY_FOR_DELIVERY"
    BLOCKED = "BLOCKED"


class ReadinessCheckInput(BaseModel):
    check_type: str = Field(min_length=1)
    required: bool = True
    status: CheckStatus
    owner: Optional[str] = None
    blocking_reason: Optional[str] = None


class ConflictInput(BaseModel):
    id: str
    severity: str
    status: str
    owner: Optional[str] = None
    description: Optional[str] = None


class ApprovalInput(BaseModel):
    id: str
    target_type: str
    decision: str
    mandatory: bool = True
    approver: Optional[str] = None


class ReadinessEvaluationRequest(BaseModel):
    project_id: str
    checks: list[ReadinessCheckInput] = Field(default_factory=list)
    conflicts: list[ConflictInput] = Field(default_factory=list)
    approvals: list[ApprovalInput] = Field(default_factory=list)


class BlockingItem(BaseModel):
    type: str
    reference: str
    reason: str
    owner: Optional[str] = None


class ReadinessEvaluationResponse(BaseModel):
    project_id: str
    status: ProjectReadinessStatus
    blockers: list[BlockingItem]
    passed_checks: list[str]
