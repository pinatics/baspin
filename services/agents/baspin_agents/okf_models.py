from typing import Optional

from pydantic import BaseModel, Field


class OKFRequirementInput(BaseModel):
    requirement_id: str
    title: str
    description: str
    requirement_type: str
    department: str
    owner: Optional[str] = None
    source_ids: list[str] = Field(default_factory=list)
    process_step: Optional[str] = None
    approved: bool = True


class OKFFinalApprovalInput(BaseModel):
    approval_id: str
    decision: str
    active: bool = True
    consolidated_analysis_id: str
    consolidated_analysis_version: int


class OKFConversionRequest(BaseModel):
    project_id: str
    project_name: str
    business_goal: str
    consolidated_analysis_id: str
    consolidated_analysis_version: int
    final_approval: OKFFinalApprovalInput
    requirements: list[OKFRequirementInput] = Field(default_factory=list)


class OKFArtifact(BaseModel):
    project_id: str
    schema_version: str = "0.1"
    source_analysis_id: str
    source_analysis_version: int
    final_approval_id: str
    content: dict
    status: str = "APPROVED"


class OKFConversionResponse(BaseModel):
    artifact: OKFArtifact
    warnings: list[str] = Field(default_factory=list)
