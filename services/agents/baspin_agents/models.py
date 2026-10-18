from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class QuestionType(str, Enum):
    INITIAL = "INITIAL"
    FOLLOW_UP = "FOLLOW_UP"
    CLARIFICATION = "CLARIFICATION"
    CONFLICT_RESOLUTION = "CONFLICT_RESOLUTION"
    APPROVAL_CONFIRMATION = "APPROVAL_CONFIRMATION"


class QuestionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class KnownFact(BaseModel):
    text: str = Field(min_length=1)
    source: Optional[str] = None
    approved: bool = False


class OpenIssue(BaseModel):
    text: str = Field(min_length=1)
    issue_type: str = "UNKNOWN"
    severity: QuestionPriority = QuestionPriority.MEDIUM


class QuestionAgentRequest(BaseModel):
    project_id: str
    project_name: str
    business_goal: str
    scope: Optional[str] = None
    department: str
    department_role: Optional[str] = None
    known_facts: list[KnownFact] = Field(default_factory=list)
    open_issues: list[OpenIssue] = Field(default_factory=list)
    max_questions: int = Field(default=8, ge=1, le=20)


class GeneratedQuestion(BaseModel):
    id: str
    text: str
    question_type: QuestionType
    priority: QuestionPriority
    rationale: str
    expected_owner: Optional[str] = None
    related_issue: Optional[str] = None
    generated_by: str = "question-agent"
    requires_human_answer: bool = True


class QuestionAgentResponse(BaseModel):
    project_id: str
    department: str
    questions: list[GeneratedQuestion]
    assumptions: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
