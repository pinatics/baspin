from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import QuestionAgentRequest, QuestionAgentResponse
from .normalization_agent import RequirementNormalizationAgent
from .normalization_models import NormalizationRequest, NormalizationResponse
from .okf_agent import OKFConversionAgent
from .okf_models import OKFConversionRequest, OKFConversionResponse
from .question_agent import QuestionAgent
from .topic_agent import TopicNormalizationAgent
from .topic_models import TopicNormalizationRequest, TopicNormalizationResponse
from .validation_agent import ValidationAgent
from .validation_models import ValidationRequest, ValidationResponse

app = FastAPI(
    title="Baspin Agents API",
    version="0.1.0",
    description="Agent endpoints for Baspin business analysis workflows.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pinatics.github.io",
        "http://localhost:8001",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

_question_agent = QuestionAgent()
_validation_agent = ValidationAgent()
_topic_agent = TopicNormalizationAgent()
_normalization_agent = RequirementNormalizationAgent()
_okf_agent = OKFConversionAgent()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/questions/generate", response_model=QuestionAgentResponse)
def generate_questions(request: QuestionAgentRequest) -> QuestionAgentResponse:
    return _question_agent.generate(request)


@app.post("/topics/normalize", response_model=TopicNormalizationResponse)
def normalize_topics(request: TopicNormalizationRequest) -> TopicNormalizationResponse:
    return _topic_agent.normalize(request)


@app.post("/validation/evaluate", response_model=ValidationResponse)
def validate_knowledge(request: ValidationRequest) -> ValidationResponse:
    return _validation_agent.validate(request)


@app.post("/requirements/normalize", response_model=NormalizationResponse)
def normalize_requirements(request: NormalizationRequest) -> NormalizationResponse:
    return _normalization_agent.normalize(request)


@app.post("/okf/convert", response_model=OKFConversionResponse)
def convert_okf(request: OKFConversionRequest) -> OKFConversionResponse:
    try:
        return _okf_agent.convert(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
