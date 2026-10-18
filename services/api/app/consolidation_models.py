from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ConsolidationStatus(str, Enum):
    READY_FOR_FINAL_APPROVAL = "READY_FOR_FINAL_APPROVAL"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    BLOCKED = "BLOCKED"


class ApprovedRequirement(BaseModel):
    requirement_id: str
    version: int = Field(ge=1)
    title: str
    description: str
    requirement_type: str
    department: str
    owner: Optional[str] = None
    process_step: Optional[str] = None
    source_ids: list[str] = Field(default_factory=list)
    approval_id: str
    approved: bool = True


class CrossDepartmentIssueType(str, Enum):
    CONFLICT = "CONFLICT"
    DEPENDENCY = "DEPENDENCY"
    DUPLICATION = "DUPLICATION"
    OWNERSHIP_GAP = "OWNERSHIP_GAP"


class CrossDepartmentIssue(BaseModel):
    id: str
    issue_type: CrossDepartmentIssueType
    description: str
    requirement_ids: list[str]
    departments: list[str]
    blocking: bool
    clarification_question: Optional[str] = None


class ConsolidationRequest(BaseModel):
    project_id: str
    requirements: list[ApprovedRequirement] = Field(default_factory=list)
    mandatory_departments: list[str] = Field(default_factory=list)


class ConsolidatedAnalysis(BaseModel):
    project_id: str
    status: ConsolidationStatus
    requirement_ids: list[str]
    departments: list[str]
    issues: list[CrossDepartmentIssue]
    missing_mandatory_departments: list[str]
    summary: str
    ready_for_final_approval: bool
