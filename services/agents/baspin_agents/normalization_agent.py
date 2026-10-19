from __future__ import annotations

import hashlib

from .normalization_models import (
    NormalizationRequest,
    NormalizationResponse,
    NormalizedRequirement,
    RequirementStatus,
    RequirementType,
)


class RequirementNormalizationAgent:
    """Transforms validated facts into auditable candidate requirements.

    The agent does not approve requirements. It only normalizes facts that have
    already passed validation and preserves their ownership and provenance.
    """

    def normalize(self, request: NormalizationRequest) -> NormalizationResponse:
        requirements: list[NormalizedRequirement] = []
        skipped: list[str] = []
        warnings: list[str] = []

        for fact in request.facts:
            if fact.validation_status.upper() != "VALIDATED":
                skipped.append(fact.id)
                continue

            req_type = self._classify_type(fact.topic, fact.value, fact.process_step)
            req_id = self._requirement_id(request.project_id, fact.id, req_type)
            title = self._title_for(fact.topic, req_type)
            description = self._description_for(fact.value)

            provenance_parts = [f"Derived from validated fact {fact.id}"]
            if fact.source_ids:
                provenance_parts.append("sources: " + ", ".join(fact.source_ids))
            provenance_parts.append(f"department: {fact.department}")
            if fact.owner:
                provenance_parts.append(f"owner: {fact.owner}")

            requirements.append(
                NormalizedRequirement(
                    id=req_id,
                    title=title,
                    description=description,
                    requirement_type=req_type,
                    status=RequirementStatus.DEPARTMENT_REVIEW,
                    department=fact.department,
                    owner=fact.owner,
                    source_fact_ids=[fact.id],
                    source_ids=fact.source_ids,
                    provenance_note="; ".join(provenance_parts),
                )
            )

        if skipped:
            warnings.append(
                f"{len(skipped)} fact(s) were skipped because validation_status was not VALIDATED."
            )

        return NormalizationResponse(
            project_id=request.project_id,
            requirements=requirements,
            skipped_fact_ids=skipped,
            warnings=warnings,
        )

    @staticmethod
    def _classify_type(topic: str, value: str, process_step: str | None) -> RequirementType:
        topic_text = topic.lower()
        text = f"{topic} {value} {process_step or ''}".lower()

        # Business decision/eligibility rules should not be reclassified merely
        # because their wording mentions a compliance or fraud exception.
        if any(term in topic_text for term in [
            "claim_approval",
            "approval_threshold",
            "eligibility",
            "renewal_rules",
            "business_rule",
            "decision_rule",
        ]):
            return RequirementType.BUSINESS_RULE

        if any(word in text for word in ["payment", "finance", "authorization", "settlement", "reserve"]):
            return RequirementType.FINANCIAL_CONTROL
        if any(word in text for word in ["retention", "regulatory requirement", "regulation", "audit requirement"]):
            return RequirementType.COMPLIANCE_REQUIREMENT
        if any(word in text for word in ["security", "encryption", "access control", "authentication"]):
            return RequirementType.SECURITY_REQUIREMENT
        if any(word in text for word in ["api", "integration", "system of record", "service"]):
            return RequirementType.INTEGRATION_REQUIREMENT
        if any(word in text for word in ["data", "field", "lineage", "schema", "quality"]):
            return RequirementType.DATA_REQUIREMENT
        if any(word in text for word in ["latency", "availability", "performance", "uptime"]):
            return RequirementType.NON_FUNCTIONAL_REQUIREMENT
        if any(word in text for word in ["route", "workflow", "process", "manual review", "escalation"]):
            return RequirementType.PROCESS_REQUIREMENT
        return RequirementType.BUSINESS_RULE

    @staticmethod
    def _requirement_id(project_id: str, fact_id: str, req_type: RequirementType) -> str:
        digest = hashlib.sha1(f"{project_id}:{fact_id}:{req_type.value}".encode()).hexdigest()[:8]
        prefix_map = {
            RequirementType.BUSINESS_RULE: "REQ-BR",
            RequirementType.FINANCIAL_CONTROL: "REQ-FIN",
            RequirementType.COMPLIANCE_REQUIREMENT: "REQ-COMP",
            RequirementType.SECURITY_REQUIREMENT: "REQ-SEC",
            RequirementType.INTEGRATION_REQUIREMENT: "REQ-INT",
            RequirementType.DATA_REQUIREMENT: "REQ-DATA",
            RequirementType.NON_FUNCTIONAL_REQUIREMENT: "REQ-NFR",
            RequirementType.PROCESS_REQUIREMENT: "REQ-PROC",
            RequirementType.FUNCTIONAL_REQUIREMENT: "REQ-FUNC",
        }
        return f"{prefix_map[req_type]}-{digest}"

    @staticmethod
    def _title_for(topic: str, req_type: RequirementType) -> str:
        pretty = topic.strip().replace("_", " ").title()
        return f"{pretty} — {req_type.value.replace('_', ' ').title()}"

    @staticmethod
    def _description_for(value: str) -> str:
        text = value.strip()
        if text.endswith("."):
            return text
        return text + "."
