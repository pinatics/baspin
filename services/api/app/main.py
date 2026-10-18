from fastapi import FastAPI, HTTPException

from .approval_models import (
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ApprovalRevalidationRequest,
    ApprovalRevalidationResponse,
)
from .approvals import decide_department_review, revalidate_approval
from .models import ReadinessEvaluationRequest, ReadinessEvaluationResponse
from .readiness import evaluate_readiness

app = FastAPI(
    title="Baspin API",
    version="0.1.0",
    description="Workflow, approval, and readiness API for Baspin.",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/readiness/evaluate", response_model=ReadinessEvaluationResponse)
def readiness_evaluate(
    request: ReadinessEvaluationRequest,
) -> ReadinessEvaluationResponse:
    return evaluate_readiness(request)


@app.post("/approvals/department", response_model=ApprovalDecisionResponse)
def department_approval(
    request: ApprovalDecisionRequest,
) -> ApprovalDecisionResponse:
    try:
        return decide_department_review(request)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.post("/approvals/revalidate", response_model=ApprovalRevalidationResponse)
def approval_revalidation(
    request: ApprovalRevalidationRequest,
) -> ApprovalRevalidationResponse:
    return revalidate_approval(request)
