"""End-to-end Baspin insurance workflow demo.

Runs the Automated Claim Approval scenario through:
Question Agent -> Validation -> Requirement Normalization -> Department-approved
requirements -> Cross-department consolidation -> Final Approval -> OKF -> Readiness.

This demo intentionally shows two states:
1. BLOCKED while Claims sources disagree on the approval threshold.
2. READY_FOR_DELIVERY after the conflict is explicitly resolved and approvals exist.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "agents"))
sys.path.insert(0, str(ROOT / "services" / "api"))

from baspin_agents.models import QuestionAgentRequest
from baspin_agents.normalization_agent import RequirementNormalizationAgent
from baspin_agents.normalization_models import NormalizationFact, NormalizationRequest
from baspin_agents.okf_agent import OKFConversionAgent
from baspin_agents.okf_models import (
    OKFConversionRequest,
    OKFFinalApprovalInput,
    OKFRequirementInput,
)
from baspin_agents.question_agent import QuestionAgent
from baspin_agents.validation_agent import ValidationAgent
from baspin_agents.validation_models import ValidationFact, ValidationRequest

from app.consolidation import consolidate_requirements
from app.consolidation_models import ApprovedRequirement, ConsolidationRequest
from app.final_approval import record_final_approval
from app.final_approval_models import FinalApprovalDecision, FinalApprovalRequest
from app.models import (
    ApprovalInput,
    CheckStatus,
    ConflictInput,
    ReadinessCheckInput,
    ReadinessEvaluationRequest,
)
from app.readiness import evaluate_readiness

PROJECT_ID = "insurance-automated-claim-approval"


def generate_claims_questions():
    return QuestionAgent().generate(
        QuestionAgentRequest(
            project_id=PROJECT_ID,
            project_name="Automated Claim Approval",
            business_goal="Reduce manual processing for eligible low-risk claims.",
            department="Claims Operations",
            department_role="Claims Manager",
            max_questions=6,
        )
    )


def run_blocked_state() -> dict:
    validation = ValidationAgent().validate(
        ValidationRequest(
            project_id=PROJECT_ID,
            required_topics=["automatic_claim_approval_threshold"],
            facts=[
                ValidationFact(
                    id="FACT-CLAIMS-MANAGER",
                    topic="automatic_claim_approval_threshold",
                    value="$25,000",
                    source_type="human_answer",
                    source_name="Claims Manager confirmed answer",
                    department="Claims Operations",
                    owner="Claims Manager",
                    approved=True,
                    process_step="claim_decision",
                ),
                ValidationFact(
                    id="FACT-CLAIMS-POLICY",
                    topic="automatic_claim_approval_threshold",
                    value="$20,000",
                    source_type="policy",
                    source_name="Claims Policy v2.1",
                    department="Claims Operations",
                    owner="Claims Operations",
                    approved=True,
                    process_step="claim_decision",
                ),
            ],
        )
    )

    blocking_findings = [finding for finding in validation.findings if finding.blocking]

    readiness = evaluate_readiness(
        ReadinessEvaluationRequest(
            project_id=PROJECT_ID,
            checks=[
                ReadinessCheckInput(
                    check_type="Critical Conflict Resolution",
                    required=True,
                    status=CheckStatus.FAIL,
                    owner="Claims Operations",
                    blocking_reason="Claims threshold conflict is unresolved.",
                )
            ],
            conflicts=[
                ConflictInput(
                    id=finding.id,
                    severity=finding.severity.value,
                    status="OPEN",
                    owner=finding.owner,
                    description=finding.description,
                )
                for finding in blocking_findings
            ],
            approvals=[],
        )
    )

    return {
        "validation": validation.model_dump(mode="json"),
        "readiness": readiness.model_dump(mode="json"),
    }


def run_resolved_state() -> dict:
    # Human resolution: $25,000 is authoritative; policy v2.1 is superseded and tracked
    # as a separate policy-update dependency rather than competing business truth.
    validated_facts = [
        NormalizationFact(
            id="FACT-CLAIMS-RESOLVED",
            topic="automatic_claim_approval_threshold",
            value=(
                "A claim may be automatically approved when claim amount is less than or "
                "equal to $25,000, required documents are complete, coverage is valid, "
                "and no blocking fraud or exception condition exists"
            ),
            department="Claims Operations",
            owner="Claims Manager",
            source_ids=["Claims SOP v3.1", "Claims Manager confirmation"],
            validation_status="VALIDATED",
            process_step="claim_decision",
        ),
        NormalizationFact(
            id="FACT-FINANCE-AUTH",
            topic="payment_authorization_threshold",
            value="Payment release above $15,000 requires Finance authorization",
            department="Finance",
            owner="Finance Operations Manager",
            source_ids=["Finance Control Matrix"],
            validation_status="VALIDATED",
            process_step="payment_release",
        ),
        NormalizationFact(
            id="FACT-LEGAL-RETENTION",
            topic="decision_record_retention",
            value="Automated claim decision evidence must be retained for 7 years",
            department="Legal",
            owner="Legal Counsel",
            source_ids=["Legal Retention Policy"],
            validation_status="VALIDATED",
            process_step="decision_audit",
        ),
    ]

    normalized = RequirementNormalizationAgent().normalize(
        NormalizationRequest(project_id=PROJECT_ID, facts=validated_facts)
    )

    process_steps = {
        "FACT-CLAIMS-RESOLVED": "claim_decision",
        "FACT-FINANCE-AUTH": "payment_release",
        "FACT-LEGAL-RETENTION": "decision_audit",
    }

    approved_requirements = []
    for requirement in normalized.requirements:
        source_fact_id = requirement.source_fact_ids[0]
        approved_requirements.append(
            ApprovedRequirement(
                requirement_id=requirement.id,
                version=1,
                title=requirement.title,
                description=requirement.description,
                requirement_type=requirement.requirement_type.value,
                department=requirement.department,
                owner=requirement.owner,
                process_step=process_steps[source_fact_id],
                source_ids=requirement.source_ids,
                approval_id=f"APR-{requirement.id}",
                approved=True,
            )
        )

    consolidated = consolidate_requirements(
        ConsolidationRequest(
            project_id=PROJECT_ID,
            requirements=approved_requirements,
            mandatory_departments=["Claims Operations", "Finance", "Legal"],
        )
    )

    if not consolidated.ready_for_final_approval:
        raise RuntimeError(
            f"Resolved scenario unexpectedly failed consolidation: {consolidated.model_dump()}"
        )

    analysis_id = "ANALYSIS-INSURANCE-001"
    analysis_version = 1

    final_approval = record_final_approval(
        FinalApprovalRequest(
            project_id=PROJECT_ID,
            consolidated_analysis_id=analysis_id,
            consolidated_analysis_version=analysis_version,
            decision=FinalApprovalDecision.APPROVED,
            approver="Business Sponsor",
            role="Final Approver",
            comment="Approved after required department reviews and conflict resolution.",
        )
    )

    okf_requirements = [
        OKFRequirementInput(
            requirement_id=req.requirement_id,
            title=req.title,
            description=req.description,
            requirement_type=req.requirement_type,
            department=req.department,
            owner=req.owner,
            source_ids=req.source_ids,
            process_step=req.process_step,
            approved=True,
        )
        for req in approved_requirements
    ]

    okf = OKFConversionAgent().convert(
        OKFConversionRequest(
            project_id=PROJECT_ID,
            project_name="Automated Claim Approval",
            business_goal="Reduce manual processing for eligible low-risk claims.",
            consolidated_analysis_id=analysis_id,
            consolidated_analysis_version=analysis_version,
            final_approval=OKFFinalApprovalInput(
                approval_id=final_approval.approval.id,
                decision=final_approval.approval.decision.value,
                active=final_approval.approval.active,
                consolidated_analysis_id=analysis_id,
                consolidated_analysis_version=analysis_version,
            ),
            requirements=okf_requirements,
        )
    )

    readiness = evaluate_readiness(
        ReadinessEvaluationRequest(
            project_id=PROJECT_ID,
            checks=[
                ReadinessCheckInput(check_type="Business Requirements", status=CheckStatus.PASS),
                ReadinessCheckInput(check_type="Finance Controls", status=CheckStatus.PASS),
                ReadinessCheckInput(check_type="Legal", status=CheckStatus.PASS),
                ReadinessCheckInput(check_type="Critical Conflict Resolution", status=CheckStatus.PASS),
                ReadinessCheckInput(check_type="OKF Artifact", status=CheckStatus.PASS),
            ],
            conflicts=[],
            approvals=[
                ApprovalInput(
                    id=final_approval.approval.id,
                    target_type="Final Analysis",
                    decision="APPROVED",
                    mandatory=True,
                    approver=final_approval.approval.approver,
                )
            ],
        )
    )

    return {
        "normalized_requirements": normalized.model_dump(mode="json"),
        "consolidated_analysis": consolidated.model_dump(mode="json"),
        "final_approval": final_approval.model_dump(mode="json"),
        "okf": okf.model_dump(mode="json"),
        "readiness": readiness.model_dump(mode="json"),
    }


def run_demo() -> dict:
    questions = generate_claims_questions()
    blocked = run_blocked_state()
    resolved = run_resolved_state()
    return {
        "questions": questions.model_dump(mode="json"),
        "blocked_state": blocked,
        "resolved_state": resolved,
    }


if __name__ == "__main__":
    import json

    print(json.dumps(run_demo(), indent=2))
