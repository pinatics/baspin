from .okf_models import OKFArtifact, OKFConversionRequest, OKFConversionResponse


class OKFConversionAgent:
    def convert(self, request: OKFConversionRequest) -> OKFConversionResponse:
        approval = request.final_approval

        if not approval.active or approval.decision != "APPROVED":
            raise ValueError("Active final approval is required before OKF conversion.")

        if approval.consolidated_analysis_id != request.consolidated_analysis_id:
            raise ValueError("Final approval does not match the consolidated analysis.")

        if approval.consolidated_analysis_version != request.consolidated_analysis_version:
            raise ValueError("Final approval is stale for the current consolidated analysis version.")

        approved_requirements = [r for r in request.requirements if r.approved]
        skipped = [r.requirement_id for r in request.requirements if not r.approved]

        content = {
            "project": {
                "id": request.project_id,
                "name": request.project_name,
                "business_goal": request.business_goal,
            },
            "requirements": [
                {
                    "id": requirement.requirement_id,
                    "title": requirement.title,
                    "description": requirement.description,
                    "type": requirement.requirement_type,
                    "department": requirement.department,
                    "owner": requirement.owner,
                    "process_step": requirement.process_step,
                    "sources": requirement.source_ids,
                    "approval_status": "APPROVED",
                }
                for requirement in approved_requirements
            ],
            "provenance": {
                "consolidated_analysis_id": request.consolidated_analysis_id,
                "consolidated_analysis_version": request.consolidated_analysis_version,
                "final_approval_id": approval.approval_id,
            },
        }

        warnings = []
        if skipped:
            warnings.append(
                "Unapproved requirements were excluded from OKF: " + ", ".join(skipped)
            )

        return OKFConversionResponse(
            artifact=OKFArtifact(
                project_id=request.project_id,
                source_analysis_id=request.consolidated_analysis_id,
                source_analysis_version=request.consolidated_analysis_version,
                final_approval_id=approval.approval_id,
                content=content,
            ),
            warnings=warnings,
        )
