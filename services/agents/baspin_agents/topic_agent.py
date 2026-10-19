from __future__ import annotations

import re

from .topic_models import (
    NormalizedTopic,
    TopicNormalizationRequest,
    TopicNormalizationResponse,
)


class TopicNormalizationAgent:
    """Deterministic topic canonicalizer for early Baspin workflows.

    This intentionally uses transparent rules rather than silently inventing
    semantic mappings. It normalizes formatting and maps a small set of common
    business-language concepts to stable canonical topics.
    """

    def normalize(self, request: TopicNormalizationRequest) -> TopicNormalizationResponse:
        topics: list[NormalizedTopic] = []
        for item in request.items:
            original = item.proposed_topic.strip()
            combined = " ".join(
                part for part in [original, item.question_text, item.answer_text, item.department] if part
            ).lower()

            canonical, reason = self._canonical_topic(original, combined)
            topics.append(
                NormalizedTopic(
                    id=item.id,
                    canonical_topic=canonical,
                    original_topic=original,
                    reason=reason,
                )
            )

        return TopicNormalizationResponse(project_id=request.project_id, topics=topics)

    def _canonical_topic(self, original: str, combined: str) -> tuple[str, str]:
        patterns = [
            (
                ("renew", "policy"),
                "policy_renewal_rules",
                "Matched policy-renewal language across question/answer context.",
            ),
            (
                ("payment", "authoriz"),
                "payment_authorization",
                "Matched payment-authorization language across question/answer context.",
            ),
            (
                ("claim", "approval", "threshold"),
                "automatic_claim_approval_threshold",
                "Matched claim approval threshold language.",
            ),
            (
                ("retention",),
                "record_retention",
                "Matched retention language.",
            ),
            (
                ("fraud",),
                "fraud_controls",
                "Matched fraud-control language.",
            ),
        ]

        for needles, canonical, reason in patterns:
            if all(needle in combined for needle in needles):
                return canonical, reason

        fallback = self._slug(original)
        if fallback:
            return fallback, "Normalized the supplied topic label to canonical snake_case."

        inferred = self._slug(combined[:120]) or "business_rule"
        return inferred, "No explicit topic label was supplied; derived a stable fallback from context."

    @staticmethod
    def _slug(value: str) -> str:
        value = value.lower().strip()
        value = re.sub(r"[^a-z0-9]+", "_", value)
        return value.strip("_")[:80]
