from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .approval_models import (
    ApprovalDecisionRequest,
    ApprovalDecisionResponse,
    ApprovalRevalidationRequest,
    ApprovalRevalidationResponse,
)
from .approvals import decide_department_review, revalidate_approval
from .consolidation import consolidate_requirements
from .consolidation_models import ConsolidatedAnalysis, ConsolidationRequest
from .final_approval import record_final_approval
from .final_approval_models import FinalApprovalRequest, FinalApprovalResponse
from .models import ReadinessEvaluationRequest, ReadinessEvaluationResponse
from .readiness import evaluate_readiness

app = FastAPI(
    title="Baspin API",
    version="0.1.0",
    description="Workflow, approval, consolidation, final approval, and readiness API for Baspin.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://pinatics.github.io",
        "http://localhost:8000",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
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


@app.post("/consolidation/evaluate", response_model=ConsolidatedAnalysis)
def consolidation_evaluate(
    request: ConsolidationRequest,
) -> ConsolidatedAnalysis:
    return consolidate_requirements(request)


@app.post("/approvals/final", response_model=FinalApprovalResponse)
def final_approval(
    request: FinalApprovalRequest,
) -> FinalApprovalResponse:
    return record_final_approval(request)
