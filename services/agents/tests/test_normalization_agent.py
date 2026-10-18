from baspin_agents.normalization_agent import RequirementNormalizationAgent
from baspin_agents.normalization_models import NormalizationFact, NormalizationRequest, RequirementType


def test_validated_claim_fact_becomes_requirement() -> None:
    agent = RequirementNormalizationAgent()
    response = agent.normalize(
        NormalizationRequest(
            project_id="automated-claim-approval",
            facts=[
                NormalizationFact(
                    id="F-CLAIMS-001",
                    topic="claim approval threshold",
                    value="Eligible claims up to $25,000 may be automatically approved when required conditions are met",
                    department="Claims Operations",
                    owner="Claims Manager",
                    source_ids=["E-001", "A-CLAIMS-001"],
                    validation_status="VALIDATED",
                    process_step="claim decision",
                )
            ],
        )
    )

    assert len(response.requirements) == 1
    requirement = response.requirements[0]
    assert requirement.requirement_type == RequirementType.BUSINESS_RULE
    assert requirement.department == "Claims Operations"
    assert requirement.owner == "Claims Manager"
    assert requirement.source_fact_ids == ["F-CLAIMS-001"]
    assert "E-001" in requirement.source_ids
    assert requirement.requires_human_approval is True


def test_unvalidated_fact_is_not_normalized() -> None:
    agent = RequirementNormalizationAgent()
    response = agent.normalize(
        NormalizationRequest(
            project_id="automated-claim-approval",
            facts=[
                NormalizationFact(
                    id="F-CONFLICT-001",
                    topic="claim approval threshold",
                    value="The threshold may be either $20,000 or $25,000",
                    department="Claims Operations",
                    owner="Claims Manager",
                    validation_status="CONFLICT",
                )
            ],
        )
    )

    assert response.requirements == []
    assert response.skipped_fact_ids == ["F-CONFLICT-001"]
    assert response.warnings


def test_finance_rule_is_classified_as_financial_control() -> None:
    agent = RequirementNormalizationAgent()
    response = agent.normalize(
        NormalizationRequest(
            project_id="automated-claim-approval",
            facts=[
                NormalizationFact(
                    id="F-FIN-001",
                    topic="payment authorization threshold",
                    value="Payments above $15,000 require Finance authorization before release",
                    department="Finance",
                    owner="Finance Operations Manager",
                    source_ids=["E-004"],
                    validation_status="VALIDATED",
                    process_step="payment release",
                )
            ],
        )
    )

    assert response.requirements[0].requirement_type == RequirementType.FINANCIAL_CONTROL
