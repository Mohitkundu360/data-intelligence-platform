import csv
import io
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy import Text, cast, desc, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Dataset, Evidence, Record, Source, Workflow
from app.planner.planner import PlannerError, plan_from_prompt
from app.schemas.api import (CreateWorkflowRequest, EvidenceOut, PlanRequest, PlanResponse,
                             RecordOut, RecordsPage, StepOut, WorkflowOut)
from app.services.workflows import create_workflow, enqueue

router = APIRouter(prefix="/api")


def label(c: float) -> str:
    return "high" if c >= 0.8 else "medium" if c >= 0.5 else "low"


def _wf_out(wf: Workflow) -> WorkflowOut:
    return WorkflowOut(
        id=wf.id, prompt=wf.prompt, status=wf.status, plan=wf.plan, error=wf.error,
        created_at=wf.created_at, completed_at=wf.completed_at,
        steps=[StepOut.model_validate(s) for s in wf.steps],
        record_count=wf.dataset.record_count if wf.dataset else 0,
    )


def _get_wf(db: Session, wf_id: int) -> Workflow:
    wf = db.get(Workflow, wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


@router.post("/plans", response_model=PlanResponse)
def preview_plan(body: PlanRequest):
    try:
        return PlanResponse(plan=plan_from_prompt(body.prompt))
    except PlannerError as e:
        raise HTTPException(422, str(e))


@router.post("/workflows", response_model=WorkflowOut, status_code=201)
def start_workflow(body: CreateWorkflowRequest, db: Session = Depends(get_db)):
    try:
        plan = body.plan or plan_from_prompt(body.prompt)
    except PlannerError as e:
        raise HTTPException(422, str(e))
    wf = create_workflow(db, body.prompt, plan)
    enqueue(wf.id)
    return _wf_out(wf)


@router.get("/workflows", response_model=list[WorkflowOut])
def list_workflows(db: Session = Depends(get_db)):
    rows = db.scalars(select(Workflow).order_by(desc(Workflow.id)).limit(50)).all()
    return [_wf_out(w) for w in rows]


@router.get("/workflows/{wf_id}", response_model=WorkflowOut)
def get_workflow(wf_id: int, db: Session = Depends(get_db)):
    return _wf_out(_get_wf(db, wf_id))


def _dataset(db: Session, wf_id: int) -> Dataset:
    ds = db.scalar(select(Dataset).where(Dataset.workflow_id == wf_id))
    if not ds:
        raise HTTPException(404, "Dataset not ready")
    return ds


@router.get("/workflows/{wf_id}/records", response_model=RecordsPage)
def list_records(wf_id: int, q: str = "", min_confidence: float = 0.0,
                 limit: int = Query(50, le=200), offset: int = 0, db: Session = Depends(get_db)):
    ds = _dataset(db, wf_id)
    stmt = select(Record).where(Record.dataset_id == ds.id, Record.confidence >= min_confidence)
    if q:
        stmt = stmt.where(cast(Record.data, Text).ilike(f"%{q}%"))
    rows = db.scalars(stmt.order_by(desc(Record.confidence), Record.id).offset(offset).limit(limit)).all()
    total = len(db.scalars(stmt).all())
    return RecordsPage(total=total, items=[
        RecordOut(id=r.id, data=r.data, confidence=r.confidence, confidence_label=label(r.confidence),
                  validation_status=r.validation_status) for r in rows])


@router.get("/records/{rec_id}/evidence", response_model=list[EvidenceOut])
def record_evidence(rec_id: int, db: Session = Depends(get_db)):
    rec = db.get(Record, rec_id)
    if not rec:
        raise HTTPException(404, "Record not found")
    rows = db.execute(select(Evidence, Source).join(Source, Source.id == Evidence.source_id)
                      .where(Evidence.record_id == rec_id).order_by(Evidence.field_name)).all()
    return [EvidenceOut(field_name=e.field_name, value=rec.data.get(e.field_name), evidence_text=e.evidence_text,
                        verified=e.verified, source_url=s.url, source_title=s.title, retrieved_at=s.retrieved_at)
            for e, s in rows]


def _safe(v):
    """Neutralise spreadsheet formula injection in exported cells."""
    s = "" if v is None else str(v)
    return "'" + s if s[:1] in ("=", "+", "-", "@") else s


@router.get("/workflows/{wf_id}/export.csv")
def export_csv(wf_id: int, db: Session = Depends(get_db)):
    ds = _dataset(db, wf_id)
    names = [f["name"] for f in ds.fields_schema]
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(names + ["confidence", "source_urls"])
    for r in db.scalars(select(Record).where(Record.dataset_id == ds.id).order_by(desc(Record.confidence))):
        urls = db.scalars(select(Source.url).join(Evidence, Evidence.source_id == Source.id)
                          .where(Evidence.record_id == r.id).distinct()).all()
        w.writerow([_safe(r.data.get(n)) for n in names] + [r.confidence, _safe(" ".join(urls))])
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="workflow-{wf_id}.csv"'})


@router.get("/workflows/{wf_id}/export.json")
def export_json(wf_id: int, db: Session = Depends(get_db)):
    ds = _dataset(db, wf_id)
    out = [{**r.data, "_confidence": r.confidence} for r in
           db.scalars(select(Record).where(Record.dataset_id == ds.id).order_by(desc(Record.confidence)))]
    return Response(json.dumps(out, indent=2), media_type="application/json",
                    headers={"Content-Disposition": f'attachment; filename="workflow-{wf_id}.json"'})
