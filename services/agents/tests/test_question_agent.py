from fastapi.testclient import TestClient

from baspin_agents.api import app
from baspin_agents.models import KnownFact, OpenIssue, QuestionAgentRequest, QuestionPriority
from baspin_agents.question_agent import QuestionAgent


client = TestClient(app)


def test_claims_question_agent_prioritizes_open_issue() -> None:
    agent = QuestionAgent()
    request = QuestionAgentRequest(
        project_id="insurance-001",
        project_name="Automated Claim Approval",
        business_goal="Reduce manual processing for eligible low-risk claims.",
        scope="Claims approval, fraud, finance, legal, compliance, and technical controls.",
        department="Claims Operations",
        department_role="Claims Manager",
        open_issues=[
            OpenIssue(
                text="Claims SOP says $25,000 while Claims Policy says $20,000",
                issue_type="CONFLICT",
                severity=QuestionPriority.CRITICAL,
            )
        ],
        max_questions=5,
    )

    response = agent.generate(request)

    assert response.questions
    first = response.questions[0]
    assert first.question_type.value == "CLARIFICATION"
    assert first.priority.value == "CRITICAL"
    assert "authoritative" in first.text.lower()
    assert first.expected_owner == "Claims Manager"


def test_unapproved_fact_does_not_suppress_question() -> None:
    agent = QuestionAgent()
    request = QuestionAgentRequest(
        project_id="insurance-002",
        project_name="Automated Claim Approval",
        business_goal="Reduce manual processing.",
        department="Finance",
        known_facts=[
            KnownFact(
                text="Payments above $15,000 require Finance authorization.",
                source="Finance Control Matrix",
                approved=False,
            )
        ],
        max_questions=8,
    )

    response = agent.generate(request)

    assert any("payment" in q.text.lower() for q in response.questions)
    assert any("unapproved" in warning.lower() for warning in response.warnings)


def test_question_api_returns_structured_questions() -> None:
    payload = {
        "project_id": "insurance-003",
        "project_name": "Automated Claim Approval",
        "business_goal": "Reduce manual processing for eligible low-risk claims.",
        "department": "Fraud",
        "department_role": "Fraud Manager",
        "max_questions": 4,
    }

    response = client.post("/questions/generate", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["project_id"] == "insurance-003"
    assert body["department"] == "Fraud"
    assert 1 <= len(body["questions"]) <= 4
    assert all("id" in item and "rationale" in item for item in body["questions"])
