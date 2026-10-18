from fastapi.testclient import TestClient

from baspin_agents.api import app
from baspin_agents.validation_agent import ValidationAgent
from baspin_agents.validation_models import (
    FindingType,
    ValidationFact,
    ValidationRequest,
)


def test_detects_true_conflict_on_same_business_topic():
    request = ValidationRequest(
        project_id="insurance-001",
        facts=[
            ValidationFact(
                id="E-001",
                topic="automatic claim approval threshold",
                value="$25,000",
                source_type="policy_document",
                source_name="Claims SOP v3.1",
                department="Claims Operations",
                approved=True,
            ),
            ValidationFact(
                id="E-002",
                topic="automatic claim approval threshold",
                value="$20,000",
                source_type="policy_document",
                source_name="Claims Policy v2.1",
                department="Claims Operations",
                approved=True,
            ),
        ],
    )

    response = ValidationAgent().validate(request)

    conflicts = [f for f in response.findings if f.finding_type == FindingType.CONFLICT]
    assert len(conflicts) == 1
    assert conflicts[0].blocking is True
    assert set(conflicts[0].related_fact_ids) == {"E-001", "E-002"}


def test_treats_different_process_steps_as_dependency_not_conflict():
    request = ValidationRequest(
        project_id="insurance-001",
        facts=[
            ValidationFact(
                id="CLAIMS-001",
                topic="claim monetary threshold",
                value="$25,000",
                source_type="stakeholder_answer",
                source_name="Claims Manager",
                department="Claims Operations",
                approved=True,
                process_step="claim decision approval",
            ),
            ValidationFact(
                id="FIN-001",
                topic="claim monetary threshold",
                value="$15,000",
                source_type="stakeholder_answer",
                source_name="Finance Operations Manager",
                department="Finance",
                approved=True,
                process_step="payment release authorization",
            ),
        ],
    )

    response = ValidationAgent().validate(request)

    dependencies = [f for f in response.findings if f.finding_type == FindingType.DEPENDENCY]
    conflicts = [f for f in response.findings if f.finding_type == FindingType.CONFLICT]

    assert len(dependencies) == 1
    assert dependencies[0].blocking is False
    assert conflicts == []


def test_flags_missing_required_topic_and_unsupported_answer():
    request = ValidationRequest(
        project_id="insurance-001",
        required_topics=["data retention period"],
        facts=[
            ValidationFact(
                id="A-001",
                topic="customer notification",
                value="Customers are usually notified as appropriate.",
                source_type="stakeholder_answer",
                source_name=None,
                owner="Customer Service Manager",
                approved=False,
            )
        ],
    )

    response = ValidationAgent().validate(request)
    types = {f.finding_type for f in response.findings}

    assert FindingType.MISSING_INFORMATION in types
    assert FindingType.UNSUPPORTED_CLAIM in types
    assert FindingType.AMBIGUITY in types


def test_validation_api_returns_structured_findings():
    client = TestClient(app)

    response = client.post(
        "/validation/evaluate",
        json={
            "project_id": "insurance-001",
            "facts": [
                {
                    "id": "E-001",
                    "topic": "automatic claim approval threshold",
                    "value": "$25,000",
                    "source_type": "policy_document",
                    "source_name": "Claims SOP v3.1",
                    "approved": True,
                },
                {
                    "id": "E-002",
                    "topic": "automatic claim approval threshold",
                    "value": "$20,000",
                    "source_type": "policy_document",
                    "source_name": "Claims Policy v2.1",
                    "approved": True,
                },
            ],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["project_id"] == "insurance-001"
    assert payload["findings"][0]["finding_type"] == "CONFLICT"
