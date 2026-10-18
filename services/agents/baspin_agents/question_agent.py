from __future__ import annotations

import hashlib

from .models import (
    GeneratedQuestion,
    QuestionAgentRequest,
    QuestionAgentResponse,
    QuestionPriority,
    QuestionType,
)
from .question_catalog import DEPARTMENT_QUESTION_CATALOG, GENERIC_QUESTIONS


class QuestionAgent:
    """Deterministic first implementation of Baspin's Question Agent.

    The agent uses controlled department question catalogs and open-issue context.
    A model-backed provider can later extend this class without changing the
    request/response contract.
    """

    def generate(self, request: QuestionAgentRequest) -> QuestionAgentResponse:
        department_key = self._normalize_department(request.department)
        catalog = DEPARTMENT_QUESTION_CATALOG.get(department_key, GENERIC_QUESTIONS)

        generated: list[GeneratedQuestion] = []
        seen_texts: set[str] = set()

        # Open issues come first because they represent known risk or ambiguity.
        for issue in request.open_issues:
            text = self._issue_question(issue.text)
            self._append_question(
                generated,
                seen_texts,
                text=text,
                question_type=QuestionType.CLARIFICATION,
                priority=issue.severity,
                rationale="This question directly addresses an unresolved project issue.",
                expected_owner=request.department_role or request.department,
                related_issue=issue.text,
                project_id=request.project_id,
            )

        for item in catalog:
            if len(generated) >= request.max_questions:
                break
            if self._already_answered(item["text"], request):
                continue
            self._append_question(
                generated,
                seen_texts,
                text=item["text"],
                question_type=QuestionType.INITIAL,
                priority=QuestionPriority(item["priority"]),
                rationale=item["rationale"],
                expected_owner=item["expected_owner"],
                related_issue=None,
                project_id=request.project_id,
            )

        assumptions: list[str] = []
        warnings: list[str] = []

        if department_key not in DEPARTMENT_QUESTION_CATALOG:
            assumptions.append(
                "No specialized department catalog matched; generic discovery questions were used."
            )

        unapproved_facts = [fact for fact in request.known_facts if not fact.approved]
        if unapproved_facts:
            warnings.append(
                f"{len(unapproved_facts)} known fact(s) are unapproved and must not be treated as final business truth."
            )

        if not generated:
            warnings.append(
                "No new questions were generated because supplied approved facts appear to cover the current catalog."
            )

        return QuestionAgentResponse(
            project_id=request.project_id,
            department=request.department,
            questions=generated[: request.max_questions],
            assumptions=assumptions,
            warnings=warnings,
        )

    @staticmethod
    def _normalize_department(department: str) -> str:
        value = department.strip().lower()
        aliases = {
            "claims": "claims operations",
            "claims ops": "claims operations",
            "fraud / special investigations": "fraud",
            "special investigations": "fraud",
            "siu": "fraud",
            "it": "it / engineering",
            "engineering": "it / engineering",
            "data": "data / analytics",
            "analytics": "data / analytics",
        }
        return aliases.get(value, value)

    @staticmethod
    def _issue_question(issue_text: str) -> str:
        cleaned = issue_text.strip().rstrip(".?")
        return f"Please clarify and confirm the authoritative answer for this open issue: {cleaned}?"

    @staticmethod
    def _already_answered(question_text: str, request: QuestionAgentRequest) -> bool:
        """Conservative duplicate suppression.

        Only approved facts can suppress a catalog question. Unapproved facts remain
        visible as context but never cause the agent to assume the question is settled.
        """
        keywords = {
            token.lower().strip("?,.$")
            for token in question_text.split()
            if len(token.strip("?,.$")) >= 6
        }
        if not keywords:
            return False

        for fact in request.known_facts:
            if not fact.approved:
                continue
            fact_words = set(fact.text.lower().replace("$", " ").split())
            overlap = len(keywords & fact_words)
            if overlap >= max(2, len(keywords) // 2):
                return True
        return False

    @staticmethod
    def _append_question(
        questions: list[GeneratedQuestion],
        seen_texts: set[str],
        *,
        text: str,
        question_type: QuestionType,
        priority: QuestionPriority,
        rationale: str,
        expected_owner: str | None,
        related_issue: str | None,
        project_id: str,
    ) -> None:
        normalized = " ".join(text.lower().split())
        if normalized in seen_texts:
            return
        seen_texts.add(normalized)
        digest = hashlib.sha1(f"{project_id}:{normalized}".encode()).hexdigest()[:10]
        questions.append(
            GeneratedQuestion(
                id=f"Q-{digest}",
                text=text,
                question_type=question_type,
                priority=priority,
                rationale=rationale,
                expected_owner=expected_owner,
                related_issue=related_issue,
            )
        )
