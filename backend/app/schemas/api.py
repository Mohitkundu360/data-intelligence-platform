from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.plan import WorkflowPlan


class PlanRequest(BaseModel):
    prompt: str


class PlanResponse(BaseModel):
    plan: WorkflowPlan


class CreateWorkflowRequest(BaseModel):
    prompt: str
    plan: WorkflowPlan | None = None  # if omitted the planner runs


class StepOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    position: int
    type: str
    status: str
    output: dict | None
    error: str | None


class WorkflowOut(BaseModel):
    id: int
    prompt: str
    status: str
    plan: WorkflowPlan
    error: str | None
    created_at: datetime
    completed_at: datetime | None
    steps: list[StepOut]
    record_count: int


class RecordOut(BaseModel):
    id: int
    data: dict
    confidence: float
    confidence_label: str
    validation_status: str


class RecordsPage(BaseModel):
    total: int
    items: list[RecordOut]


class EvidenceOut(BaseModel):
    field_name: str
    value: str | None
    evidence_text: str
    verified: bool
    source_url: str
    source_title: str | None
    retrieved_at: datetime
