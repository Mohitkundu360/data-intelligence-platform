from sqlalchemy import select

from app.core.db import SessionLocal
from app.engine.steps import PIPELINE, Context
from app.models import Workflow, WorkflowStep, utcnow
from app.policy.source_policy import SourcePolicy
from app.schemas.plan import WorkflowPlan


def run_workflow(workflow_id: int) -> None:
    """Entry point executed by the RQ worker."""
    with SessionLocal() as db:
        wf = db.get(Workflow, workflow_id)
        if wf is None:
            return
        wf.status = "running"
        db.commit()
        ctx = Context(plan=WorkflowPlan.model_validate(wf.plan), db=db, workflow_id=wf.id, policy=SourcePolicy())
        rows = {r.type: r for r in db.scalars(select(WorkflowStep).where(WorkflowStep.workflow_id == wf.id))}
        for step in PIPELINE:
            row = rows[step.name]
            row.status, row.started_at = "running", utcnow()
            db.commit()
            try:
                row.output = step.run(ctx)
                row.status = "completed"
            except Exception as e:  # surfaced in the UI; workflow stops here
                db.rollback()
                row.status, row.error = "failed", f"{type(e).__name__}: {e}"
                wf.status, wf.error = "failed", row.error
                row.completed_at = utcnow()
                db.commit()
                return
            row.completed_at = utcnow()
            db.commit()
        wf.status, wf.completed_at = "completed", utcnow()
        db.commit()
