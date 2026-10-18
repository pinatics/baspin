import pytest

from baspin_agents.okf_agent import OKFConversionAgent
from baspin_agents.okf_models import (
    OKFConversionRequest,
    OKFFinalApprovalInput,
    OKFRequirementInput,
)


def _request(version: int = 1, decision: str = "APPROVED") -> OKFConversionRequest:
    return OKFConversionRequest(
        project_id="insurance-001",
        project_name="Automated Claim Approval",
        business_goal="Reduce manual processing for eligible low-risk claims.",
        consolidated_analysis_id="CA-001",
        consolidated_analysis_version=version,
        final_approval=OKFFinalApprovalInput(
            approval_id="FAPR-001",
            decision=decision,
            active=True,
            consolidated_analysis_id="CA-001",
            consolidated_analysis_version=1,
        ),
        requirements=[
            OKFRequirementInput(
                requirement_id="REQ-CLAIMS-001",
                title="Automatic claim approval threshold",
                description="Eligible claims up to $25,000 may be automatically approved.",
                requirement_type="BUSINESS_RULE",
                department="Claims Operations",
                owner="Claims Manager",
                source_ids=["E-001", "A-001"],
                process_step="claim_decision",
                approved=True,
            ),
            OKFRequirementInput(
                requirement_id="REQ-DRAFT-999",
                title="Unapproved draft",
                description="Draft requirement that must not enter OKF.",
                requirement_type="BUSINESS_RULE",
                department="Claims Operations",
                approved=False,
            ),
        ],
    )


def test_okf_requires_active_final_approval():
    agent = OKFConversionAgent()
    request = _request(decision="NEEDS_CLARIFICATION")

    with pytest.raises(ValueError, match="Active final approval"):
        agent.convert(request)


def test_okf_rejects_stale_final_approval():
    agent = OKFConversionAgent()
    request = _request(version=2)

    with pytest.raises(ValueError, match="stale"):
        agent.convert(request)


def test_okf_only_contains_approved_requirements_and_preserves_provenance():
    agent = OKFConversionAgent()
    response = agent.convert(_request())

    requirements = response.artifact.content["requirements"]

    assert len(requirements) == 1
    assert requirements[0]["id"] == "REQ-CLAIMS-001"
    assert requirements[0]["sources"] == ["E-001", "A-001"]
    assert response.artifact.content["provenance"]["final_approval_id"] == "FAPR-001"
    assert "REQ-DRAFT-999" in response.warnings[0]
