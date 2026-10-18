from fastapi import FastAPI

from .models import QuestionAgentRequest, QuestionAgentResponse
from .normalization_agent import RequirementNormalizationAgent
from .normalization_models import NormalizationRequest, NormalizationResponse
from .question_agent import QuestionAgent
from .validation_agent import ValidationAgent
from .validation_models import ValidationRequest, ValidationResponse

app = FastAPI(
    title="Baspin Agents API",
    version="0.1.0",
    description="Agent endpoints for Baspin business analysis workflows.",
)

_question_agent = QuestionAgent()
_validation_agent = ValidationAgent()
_normalization_agent = RequirementNormalizationAgent()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/questions/generate", response_model=QuestionAgentResponse)
def generate_questions(request: QuestionAgentRequest) -> QuestionAgentResponse:
    return _question_agent.generate(request)


@app.post("/validation/evaluate", response_model=ValidationResponse)
def validate_knowledge(request: ValidationRequest) -> ValidationResponse:
    return _validation_agent.validate(request)


@app.post("/requirements/normalize", response_model=NormalizationResponse)
def normalize_requirements(request: NormalizationRequest) -> NormalizationResponse:
    return _normalization_agent.normalize(request)
