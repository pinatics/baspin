from __future__ import annotations

import re

from .topic_models import (
    NormalizedTopic,
    TopicNormalizationRequest,
    TopicNormalizationResponse,
)


class TopicNormalizationAgent:
    """Deterministic topic canonicalizer for early Baspin workflows.

    The agent uses transparent bilingual rules so English and Turkish answers
    describing the same business concept converge on the same canonical topic.
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
        groups = [
            (
                [("renew", "policy"), ("poliçe", "yenile"), ("police", "yenile")],
                "policy_renewal_rules",
                "Matched policy-renewal / poliçe-yenileme language.",
            ),
            (
                [("payment", "authoriz"), ("ödeme", "onay"), ("odeme", "onay"), ("ödeme", "yetki"), ("odeme", "yetki")],
                "payment_authorization",
                "Matched payment-authorization / ödeme-onayı language.",
            ),
            (
                [("claim", "approval", "threshold"), ("hasar", "onay", "limit"), ("hasar", "onay", "eşik"), ("hasar", "onay", "esik")],
                "automatic_claim_approval_threshold",
                "Matched claim-approval-threshold / hasar-onay-limiti language.",
            ),
            (
                [("retention",), ("saklama",), ("muhafaza",)],
                "record_retention",
                "Matched record-retention / kayıt-saklama language.",
            ),
            (
                [("fraud",), ("dolandırıc",), ("dolandiric",), ("sahtecilik",)],
                "fraud_controls",
                "Matched fraud-control language.",
            ),
        ]

        for alternatives, canonical, reason in groups:
            if any(all(needle in combined for needle in needles) for needles in alternatives):
                return canonical, reason

        fallback = self._slug(original)
        if fallback:
            return fallback, "Normalized the supplied topic label to canonical snake_case."

        inferred = self._slug(combined[:120]) or "business_rule"
        return inferred, "No explicit topic label was supplied; derived a stable fallback from context."

    @staticmethod
    def _slug(value: str) -> str:
        translation = str.maketrans({
            "ç": "c",
            "ğ": "g",
            "ı": "i",
            "ö": "o",
            "ş": "s",
            "ü": "u",
        })
        value = value.lower().translate(translation).strip()
        value = re.sub(r"[^a-z0-9]+", "_", value)
        return value.strip("_")[:80]
