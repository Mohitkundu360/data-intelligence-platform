"""Pipeline steps. Each is independently observable: run() returns metrics that are
stored on its WorkflowStep row and shown in the UI."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from urllib.parse import urlparse

from rapidfuzz import fuzz
from sqlalchemy.orm import Session

from app.core.config import settings
from app.engine.fetch import FetchError, fetch_page
from app.extract.heuristic import extract_kv
from app.extract.llm import extract_with_llm
from app.models import Dataset, Evidence, Record, Source
from app.policy.source_policy import SourcePolicy
from app.schemas.plan import WorkflowPlan
from app.search.fixtures import FIXTURE_PAGES
from app.search.providers import SearchResult, get_search_provider


class StepError(Exception):
    pass


@dataclass
class EvidenceItem:
    field: str
    source_url: str
    text: str
    verified: bool = False


@dataclass
class Candidate:
    data: dict[str, str | None]
    evidence: list[EvidenceItem]
    completeness: float = 0.0
    grounded: float = 0.0
    confidence: float = 0.0
    fingerprint: str = ""


@dataclass
class Page:
    url: str
    title: str
    text: str
    source_id: int


@dataclass
class Context:
    plan: WorkflowPlan
    db: Session
    workflow_id: int
    policy: SourcePolicy
    urls: list[SearchResult] = field(default_factory=list)
    pages: list[Page] = field(default_factory=list)
    candidates: list[Candidate] = field(default_factory=list)


class Step:
    name = "step"

    def run(self, ctx: Context) -> dict:
        raise NotImplementedError


# ---------------------------------------------------------------- discover
class Discover(Step):
    name = "discover"

    def run(self, ctx: Context) -> dict:
        provider = None
        seen: set[str] = set()
        blocked: dict[str, int] = {}
        for s in ctx.plan.sources:
            if s.type == "website":
                results = [SearchResult(url=s.query)]
            elif s.type == "search":
                provider = provider or get_search_provider()
                results = provider.search(s.query, limit=10)
            else:
                continue  # TODO: rss support
            for r in results:
                if r.url in seen:
                    continue
                seen.add(r.url)
                ok, why = ctx.policy.check(r.url)
                if ok:
                    ctx.urls.append(r)
                else:
                    blocked[why] = blocked.get(why, 0) + 1
        if not ctx.urls:
            raise StepError("No permitted sources were discovered.")
        return {"sources_discovered": len(ctx.urls), "blocked": sum(blocked.values()), "blocked_reasons": blocked}


# ---------------------------------------------------------------- collect
class Collect(Step):
    name = "collect"

    def run(self, ctx: Context) -> dict:
        failed = 0
        for r in ctx.urls[: settings.max_pages_per_workflow]:
            try:
                if r.url.startswith("fixture://"):
                    url, title, text = r.url, r.title, FIXTURE_PAGES[r.url]
                else:
                    url, title, text = fetch_page(r.url, ctx.policy)
            except (FetchError, Exception):  # one bad page must not sink the workflow
                failed += 1
                continue
            src = Source(workflow_id=ctx.workflow_id, url=url, title=title,
                         content_hash=hashlib.sha256(text.encode()).hexdigest())
            ctx.db.add(src)
            ctx.db.flush()
            ctx.pages.append(Page(url, title, text, src.id))
        ctx.db.commit()
        if not ctx.pages:
            raise StepError("Could not collect any pages.")
        return {"pages_collected": len(ctx.pages), "pages_failed": failed}


# ---------------------------------------------------------------- extract
class Extract(Step):
    names = "extract"

    def run(self, ctx: Context) -> dict:
        names = [f.name for f in ctx.plan.fields]
        llm_calls = 0
        target = ctx.plan.target_count
        max_llm_calls = 5

        for page in ctx.pages:
            rows = extract_kv(page.text, names)

            if not rows and settings.openrouter_api_key and llm_calls < max_llm_calls:
                try:
                    rows = extract_with_llm(page.text, ctx.plan)
                except Exception as exc:
                    print(f"LLM extraction failed: {type(exc).__name__}: {exc}", flush=True)
                    rows = []
                finally:
                    llm_calls += 1

            for row in rows:
                ctx.candidates.append(
                    Candidate(
                        data={n: (row[n][0] if n in row else None) for n in names},
                        evidence=[
                            EvidenceItem(n, page.url, row[n][1])
                            for n in row
                        ],
                    )
                )

            if target and len(ctx.candidates) >= target * 3:
                break

        return {
            "records_extracted": len(ctx.candidates),
            "llm_calls": llm_calls,
        }

# ---------------------------------------------------------------- normalize
def _canon_url(v: str) -> str:
    if "://" not in v and "." in v:
        v = "https://" + v
    p = urlparse(v)
    return p._replace(netloc=p.netloc.lower()).geturl().rstrip("/")


class Normalize(Step):
    name = "normalize"

    def run(self, ctx: Context) -> dict:
        for c in ctx.candidates:
            for k, v in c.data.items():
                if not v:
                    continue
                v = re.sub(r"\s+", " ", v).strip()
                if k.endswith("url") or k in ("website", "url"):
                    v = _canon_url(v)
                c.data[k] = v or None
        return {"records": len(ctx.candidates)}


# ---------------------------------------------------------------- validate
def _passes(c: Candidate, plan: WorkflowPlan) -> bool:
    for f in plan.filters:
        v = c.data.get(f.field)
        if v is None:
            continue  # cannot judge a missing value; required-field check handles absences
        a, b = v.lower(), f.value.lower()
        if f.operator == "equals" and a != b:
            return False
        if f.operator == "contains" and b not in a:
            return False
        if f.operator in ("greater_than", "less_than"):
            try:
                x, y = float(v), float(f.value)
            except ValueError:
                continue
            if (f.operator == "greater_than" and not x > y) or (f.operator == "less_than" and not x < y):
                return False
    return True


class Validate(Step):
    name = "validate"

    def run(self, ctx: Context) -> dict:
        required = [f.name for f in ctx.plan.fields if f.required]
        total = len(ctx.plan.fields)
        kept, missing, filtered = [], 0, 0
        for c in ctx.candidates:
            if any(not c.data.get(r) for r in required):
                missing += 1
                continue
            if not _passes(c, ctx.plan):
                filtered += 1
                continue
            c.completeness = sum(1 for v in c.data.values() if v) / total
            kept.append(c)
        ctx.candidates = kept
        return {"records_valid": len(kept), "dropped_missing_required": missing, "dropped_by_filters": filtered}


# ---------------------------------------------------------------- deduplicate
_LEGAL = {"pvt", "private", "ltd", "limited", "inc", "llp", "llc", "corp", "corporation", "co"}


def _norm(s: str) -> str:
    toks = re.sub(r"[^\w\s]", " ", s.lower()).split()
    return " ".join(t for t in toks if t not in _LEGAL)


class Deduplicate(Step):
    name = "deduplicate"

    def run(self, ctx: Context) -> dict:
        required = [f.name for f in ctx.plan.fields if f.required]
        ident = ctx.plan.identity_fields or required[:2] or [ctx.plan.fields[0].name]
        kept: list[tuple[str, Candidate]] = []
        removed = 0
        for c in sorted(ctx.candidates, key=lambda x: -x.completeness):
            key = " | ".join(_norm(c.data.get(f) or "") for f in ident)
            c.fingerprint = hashlib.sha1(key.encode()).hexdigest()
            dup = next((o for k, o in kept if fuzz.token_sort_ratio(k, key) >= 90), None)
            if dup:
                for k, v in c.data.items():
                    if v and not dup.data.get(k):
                        dup.data[k] = v
                dup.evidence.extend(c.evidence)  # corroborating sources are kept
                removed += 1
            else:
                kept.append((key, c))
        ctx.candidates = [c for _, c in kept]
        return {"duplicates_removed": removed, "records_unique": len(ctx.candidates), "identity_fields": ident}


# ---------------------------------------------------------------- verify sources
def _loose(s: str) -> str:
    s = re.sub(r"\s+", " ", s.lower()).strip()
    return re.sub(r"^https?://", "", s).rstrip("/")


class VerifySources(Step):
    """Grounding check: is each evidence quote really in the fetched page, and does it contain the value?"""

    name = "verify"

    def run(self, ctx: Context) -> dict:
        text_by_url = {p.url: _loose(p.text) for p in ctx.pages}
        n_ev = n_ok = 0
        for c in ctx.candidates:
            for e in c.evidence:
                value = c.data.get(e.field)
                e.verified = bool(
                    value and e.text
                    and _loose(e.text) in text_by_url.get(e.source_url, "")
                    and _loose(value) in _loose(e.text)
                )
                n_ev += 1
                n_ok += e.verified
            c.grounded = (sum(e.verified for e in c.evidence) / len(c.evidence)) if c.evidence else 0.0
            c.confidence = round(0.6 * c.completeness + 0.4 * c.grounded, 3)
        return {"evidence_items": n_ev, "evidence_verified": n_ok}


# ---------------------------------------------------------------- persist
class Persist(Step):
    name = "persist"

    def run(self, ctx: Context) -> dict:
        cands = sorted(ctx.candidates, key=lambda c: -c.confidence)
        if ctx.plan.target_count:
            cands = cands[: ctx.plan.target_count]
        ds = Dataset(workflow_id=ctx.workflow_id, name=ctx.plan.objective[:200],
                     fields_schema=[f.model_dump() for f in ctx.plan.fields], record_count=len(cands))
        ctx.db.add(ds)
        ctx.db.flush()
        sid = {p.url: p.source_id for p in ctx.pages}
        for c in cands:
            rec = Record(dataset_id=ds.id, data=c.data, fingerprint=c.fingerprint, confidence=c.confidence)
            ctx.db.add(rec)
            ctx.db.flush()
            for e in c.evidence:
                if e.source_url in sid:
                    ctx.db.add(Evidence(record_id=rec.id, field_name=e.field, source_id=sid[e.source_url],
                                        evidence_text=e.text, verified=e.verified))
        ctx.db.commit()
        return {"records_ready": len(cands)}


PIPELINE: list[Step] = [Discover(), Collect(), Extract(), Normalize(), Validate(), Deduplicate(), VerifySources(), Persist()]
