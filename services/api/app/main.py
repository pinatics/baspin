from fastapi import FastAPI

from .models import ReadinessEvaluationRequest, ReadinessEvaluationResponse
from .readiness import evaluate_readiness

app = FastAPI(
    title="Baspin API",
    version="0.1.0",
    description="Workflow and readiness API for Baspin.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/readiness/evaluate", response_model=ReadinessEvaluationResponse)
def readiness_evaluate(
    request: ReadinessEvaluationRequest,
) -> ReadinessEvaluationResponse:
    return evaluate_readiness(request)
