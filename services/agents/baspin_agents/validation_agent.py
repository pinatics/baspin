from __future__ import annotations

import hashlib
from collections import defaultdict

from .validation_models import (
    FindingSeverity,
    FindingType,
    ValidationFinding,
    ValidationRequest,
    ValidationResponse,
)


class ValidationAgent:
    """Deterministic first implementation of Baspin's Validation Agent."""

    def validate(self, request: ValidationRequest) -> ValidationResponse:
        findings: list[ValidationFinding] = []
        validated_fact_ids: list[str] = []

        superseded_ids = {
            superseded_id
            for fact in request.facts
            for superseded_id in fact.supersedes
        }
        active_facts = [fact for fact in request.facts if fact.id not in superseded_ids]

        by_topic = defaultdict(list)
        for fact in active_facts:
            by_topic[fact.topic.strip().lower()].append(fact)

        for required_topic in request.required_topics:
            key = required_topic.strip().lower()
            if key not in by_topic:
                findings.append(
                    self._finding(
                        request.project_id,
                        FindingType.MISSING_INFORMATION,
                        FindingSeverity.HIGH,
                        required_topic,
                        f"No active fact was supplied for required topic '{required_topic}'.",
                        [],
                        blocking=True,
                        clarification_question=(
                            f"Please provide and confirm the authoritative information for {required_topic}."
                        ),
                    )
                )

        for topic, facts in by_topic.items():
            normalized_values = {self._normalize_value(f.value) for f in facts}
            process_steps = {f.process_step for f in facts if f.process_step}

            if len(normalized_values) > 1:
                if len(process_steps) > 1 and len(process_steps) == len(facts):
                    findings.append(
                        self._finding(
                            request.project_id,
                            FindingType.DEPENDENCY,
                            FindingSeverity.MEDIUM,
                            topic,
                            (
                                "Different values appear to describe separate process steps rather than the same rule. "
                                "Confirm the relationship between the steps before normalization."
                            ),
                            [f.id for f in facts],
                            owner=self._first_owner(facts),
                            blocking=False,
                            clarification_question=(
                                f"The values for {topic} differ across process steps. Are these separate controls, and how should they sequence?"
                            ),
                        )
                    )
                else:
                    findings.append(
                        self._finding(
                            request.project_id,
                            FindingType.CONFLICT,
                            FindingSeverity.HIGH,
                            topic,
                            "Active sources disagree on the same business topic and no authoritative value can be selected automatically.",
                            [f.id for f in facts],
                            owner=self._first_owner(facts),
                            blocking=True,
                            clarification_question=(
                                f"Conflicting values were found for {topic}. Which value is authoritative for this project?"
                            ),
                        )
                    )
                    continue

            for fact in facts:
                if fact.source_type.strip().lower() in {"answer", "stakeholder_answer", "human_answer"} and not fact.source_name:
                    findings.append(
                        self._finding(
                            request.project_id,
                            FindingType.UNSUPPORTED_CLAIM,
                            FindingSeverity.MEDIUM,
                            fact.topic,
                            f"Fact {fact.id} has no supporting source reference.",
                            [fact.id],
                            owner=fact.owner,
                            blocking=not fact.approved,
                            clarification_question=(
                                f"What approved document, system record, or policy supports this statement about {fact.topic}?"
                            ),
                        )
                    )

                if self._looks_ambiguous(fact.value):
                    findings.append(
                        self._finding(
                            request.project_id,
                            FindingType.AMBIGUITY,
                            FindingSeverity.MEDIUM,
                            fact.topic,
                            f"Fact {fact.id} uses ambiguous or non-testable language: '{fact.value}'.",
                            [fact.id],
                            owner=fact.owner,
                            blocking=False,
                            clarification_question=(
                                f"Please rewrite the statement for {fact.topic} as a specific, testable business rule."
                            ),
                        )
                    )

            topic_has_blocking = any(
                finding.blocking and finding.topic.strip().lower() == topic
                for finding in findings
            )
            if not topic_has_blocking:
                validated_fact_ids.extend(f.id for f in facts if f.approved)

        warnings: list[str] = []
        unapproved_count = sum(1 for fact in active_facts if not fact.approved)
        if unapproved_count:
            warnings.append(
                f"{unapproved_count} active fact(s) are not approved and cannot be treated as final business truth."
            )
        if superseded_ids:
            warnings.append(
                f"{len(superseded_ids)} historical fact(s) were retained for audit but excluded from active conflict evaluation because a later resolution superseded them."
            )

        return ValidationResponse(
            project_id=request.project_id,
            findings=findings,
            validated_fact_ids=sorted(set(validated_fact_ids)),
            warnings=warnings,
        )

    @staticmethod
    def _normalize_value(value: str) -> str:
        return " ".join(value.lower().replace(",", "").split())

    @staticmethod
    def _looks_ambiguous(value: str) -> bool:
        vague_terms = (
            "usually",
            "generally",
            "sometimes",
            "as needed",
            "appropriate",
            "reasonable",
            "may be",
        )
        lowered = value.lower()
        return any(term in lowered for term in vague_terms)

    @staticmethod
    def _first_owner(facts) -> str | None:
        for fact in facts:
            if fact.owner:
                return fact.owner
        for fact in facts:
            if fact.department:
                return fact.department
        return None

    @staticmethod
    def _finding(
        project_id: str,
        finding_type: FindingType,
        severity: FindingSeverity,
        topic: str,
        description: str,
        related_fact_ids: list[str],
        *,
        owner: str | None = None,
        blocking: bool = False,
        clarification_question: str | None = None,
    ) -> ValidationFinding:
        seed = f"{project_id}:{finding_type}:{topic}:{'|'.join(sorted(related_fact_ids))}:{description}"
        digest = hashlib.sha1(seed.encode()).hexdigest()[:10]
        return ValidationFinding(
            id=f"F-{digest}",
            finding_type=finding_type,
            severity=severity,
            topic=topic,
            description=description,
            related_fact_ids=related_fact_ids,
            owner=owner,
            blocking=blocking,
            clarification_question=clarification_question,
        )
