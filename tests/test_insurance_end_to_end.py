from pathlib import Path
import importlib.util


def _load_demo_module():
    root = Path(__file__).resolve().parents[1]
    path = root / "examples" / "insurance" / "end_to_end_demo.py"
    spec = importlib.util.spec_from_file_location("insurance_end_to_end_demo", path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def test_insurance_workflow_blocks_then_becomes_ready():
    demo = _load_demo_module()
    result = demo.run_demo()

    assert result["blocked_state"]["readiness"]["status"] == "BLOCKED"
    assert any(
        finding["finding_type"] == "CONFLICT"
        and finding["blocking"] is True
        for finding in result["blocked_state"]["validation"]["findings"]
    )

    resolved = result["resolved_state"]
    assert resolved["consolidated_analysis"]["ready_for_final_approval"] is True
    assert resolved["final_approval"]["approved_for_okf"] is True
    assert resolved["okf"]["artifact"]["status"] == "APPROVED"
    assert resolved["readiness"]["status"] == "READY_FOR_DELIVERY"


def test_okf_preserves_requirement_provenance():
    demo = _load_demo_module()
    result = demo.run_demo()
    okf = result["resolved_state"]["okf"]["artifact"]["content"]

    requirements = okf["requirements"]
    assert len(requirements) == 3
    assert all(item["source_ids"] for item in requirements)
    assert okf["provenance"]["final_approval_id"].startswith("FAPR-")
