from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class FindingType(str, Enum):
    CONFLICT = "CONFLICT"
    DEPENDENCY = "DEPENDENCY"
    UNSUPPORTED_CLAIM = "UNSUPPORTED_CLAIM"
    MISSING_INFORMATION = "MISSING_INFORMATION"
    AMBIGUITY = "AMBIGUITY"


class FindingSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ValidationFact(BaseModel):
    id: str
    topic: str = Field(min_length=1)
    value: str = Field(min_length=1)
    source_type: str
    source_name: Optional[str] = None
    department: Optional[str] = None
    owner: Optional[str] = None
    approved: bool = False
    process_step: Optional[str] = None


class ValidationRequest(BaseModel):
    project_id: str
    facts: list[ValidationFact] = Field(default_factory=list)
    required_topics: list[str] = Field(default_factory=list)


class ValidationFinding(BaseModel):
    id: str
    finding_type: FindingType
    severity: FindingSeverity
    topic: str
    description: str
    related_fact_ids: list[str] = Field(default_factory=list)
    owner: Optional[str] = None
    blocking: bool = False
    clarification_question: Optional[str] = None


class ValidationResponse(BaseModel):
    project_id: str
    findings: list[ValidationFinding]
    validated_fact_ids: list[str]
    warnings: list[str] = Field(default_factory=list)
