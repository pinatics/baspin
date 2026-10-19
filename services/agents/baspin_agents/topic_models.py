from pydantic import BaseModel, Field


class TopicCandidate(BaseModel):
    id: str
    proposed_topic: str = ""
    question_text: str = ""
    answer_text: str = ""
    department: str = ""


class TopicNormalizationRequest(BaseModel):
    project_id: str
    items: list[TopicCandidate] = Field(default_factory=list)


class NormalizedTopic(BaseModel):
    id: str
    canonical_topic: str
    original_topic: str
    reason: str


class TopicNormalizationResponse(BaseModel):
    project_id: str
    topics: list[NormalizedTopic]
