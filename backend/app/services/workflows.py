from redis import Redis
from rq import Queue
from sqlalchemy.orm import Session

from app.core.config import settings
from app.engine.steps import PIPELINE
from app.models import Workflow, WorkflowStep
from app.schemas.plan import WorkflowPlan


def create_workflow(db: Session, prompt: str, plan: WorkflowPlan) -> Workflow:
    wf = Workflow(prompt=prompt, plan=plan.model_dump(), status="pending")
    wf.steps = [WorkflowStep(position=i, type=s.name) for i, s in enumerate(PIPELINE)]
    db.add(wf)
    db.commit()
    return wf


def enqueue(workflow_id: int) -> None:
    Queue("workflows", connection=Redis.from_url(settings.redis_url)).enqueue(
        "app.engine.executor.run_workflow", workflow_id, job_timeout=1800)
