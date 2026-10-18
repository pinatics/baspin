from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RequirementType(str, Enum):
    BUSINESS_RULE = "BUSINESS_RULE"
    FUNCTIONAL_REQUIREMENT = "FUNCTIONAL_REQUIREMENT"
    NON_FUNCTIONAL_REQUIREMENT = "NON_FUNCTIONAL_REQUIREMENT"
    DATA_REQUIREMENT = "DATA_REQUIREMENT"
    COMPLIANCE_REQUIREMENT = "COMPLIANCE_REQUIREMENT"
    SECURITY_REQUIREMENT = "SECURITY_REQUIREMENT"
    PROCESS_REQUIREMENT = "PROCESS_REQUIREMENT"
    INTEGRATION_REQUIREMENT = "INTEGRATION_REQUIREMENT"
    FINANCIAL_CONTROL = "FINANCIAL_CONTROL"


class RequirementStatus(str, Enum):
    PROPOSED = "PROPOSED"
    NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION"
    DEPARTMENT_REVIEW = "DEPARTMENT_REVIEW"


class NormalizationFact(BaseModel):
    id: str
    topic: str
    value: str
    department: str
    owner: Optional[str] = None
    source_ids: list[str] = Field(default_factory=list)
    validation_status: str = "VALIDATED"
    process_step: Optional[str] = None


class NormalizationRequest(BaseModel):
    project_id: str
    facts: list[NormalizationFact] = Field(default_factory=list)


class NormalizedRequirement(BaseModel):
    id: str
    title: str
    description: str
    requirement_type: RequirementType
    status: RequirementStatus
    department: str
    owner: Optional[str] = None
    source_fact_ids: list[str] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    provenance_note: str
    requires_human_approval: bool = True


class NormalizationResponse(BaseModel):
    project_id: str
    requirements: list[NormalizedRequirement]
    skipped_fact_ids: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
