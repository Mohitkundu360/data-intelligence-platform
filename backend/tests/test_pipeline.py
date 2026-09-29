import pytest
from pydantic import ValidationError

from app.core.db import Base, SessionLocal, engine
from app.engine.executor import run_workflow
from app.models import Dataset, Evidence, Record, Workflow
from app.planner.planner import plan_from_prompt
from app.schemas.plan import WorkflowPlan
from app.services.workflows import create_workflow


@pytest.fixture(autouse=True)
def _db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)


def test_plan_rejects_unknown_filter_field():
    with pytest.raises(ValidationError):
        WorkflowPlan.model_validate({
            "objective": "Find things", "fields": [{"name": "a"}],
            "sources": [{"type": "search", "query": "x"}],
            "filters": [{"field": "nope", "operator": "equals", "value": "1"}]})


def test_plan_rejects_bad_source_type():
    with pytest.raises(ValidationError):
        WorkflowPlan.model_validate({
            "objective": "Find things", "fields": [{"name": "a"}],
            "sources": [{"type": "shell", "query": "rm -rf /"}]})


def test_end_to_end_fixture_pipeline():
    plan = plan_from_prompt("Find backend jobs in India")
    with SessionLocal() as db:
        wf = create_workflow(db, "Find backend jobs in India", plan)
        wf_id = wf.id
    run_workflow(wf_id)

    with SessionLocal() as db:
        wf = db.get(Workflow, wf_id)
        assert wf.status == "completed", wf.error
        out = {s.type: s.output for s in wf.steps}
        assert out["validate"]["dropped_missing_required"] == 1      # the row missing job_title
        assert out["deduplicate"]["duplicates_removed"] == 2         # Acme (Pvt Ltd) + Northwind repeat
        assert out["verify"]["evidence_verified"] == out["verify"]["evidence_items"]
        ds = db.query(Dataset).one()
        recs = db.query(Record).all()
        assert ds.record_count == len(recs) == 6  # 9 rows - 1 invalid - 2 duplicates
        assert all(db.query(Evidence).filter_by(record_id=r.id).count() > 0 for r in recs)
        # same company, different role must NOT be merged; Acme dup kept once
        assert sum("Acme" in r.data["company_name"] for r in recs) == 1
