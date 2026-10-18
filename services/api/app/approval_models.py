from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ApprovalDecision(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"


class ReviewPackageStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT_FOR_REVIEW = "SENT_FOR_REVIEW"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class RequirementSnapshot(BaseModel):
    requirement_id: str
    version: int = Field(ge=1)
    title: str
    description: str
    owner: Optional[str] = None
    department: str


class DepartmentReviewPackage(BaseModel):
    id: str
    project_id: str
    department: str
    reviewer: str
    requirements: list[RequirementSnapshot] = Field(default_factory=list)
    open_conflict_ids: list[str] = Field(default_factory=list)
    status: ReviewPackageStatus = ReviewPackageStatus.DRAFT
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ApprovalDecisionRequest(BaseModel):
    package: DepartmentReviewPackage
    decision: ApprovalDecision
    approver: str
    comment: Optional[str] = None


class ApprovalRecord(BaseModel):
    id: str
    project_id: str
    package_id: str
    department: str
    approver: str
    decision: ApprovalDecision
    comment: Optional[str] = None
    requirement_versions: dict[str, int]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True
    superseded_reason: Optional[str] = None


class ApprovalDecisionResponse(BaseModel):
    package_status: ReviewPackageStatus
    approval: ApprovalRecord


class ApprovalRevalidationRequest(BaseModel):
    approval: ApprovalRecord
    current_requirement_versions: dict[str, int]


class ApprovalRevalidationResponse(BaseModel):
    approval_id: str
    remains_valid: bool
    stale_requirement_ids: list[str] = Field(default_factory=list)
    reason: Optional[str] = None
