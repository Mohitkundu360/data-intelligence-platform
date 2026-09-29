# AI Data Intelligence Platform

Describe the data you need in plain English. An LLM turns the request into a **validated workflow plan**;
your backend decides what actually runs. Results are cleaned, deduplicated, and stored with **field-level
evidence** so every value traces to a source.

```
Prompt -> Planner (LLM) -> Zod/Pydantic-validated plan -> Executor
  discover -> collect -> extract -> normalize -> validate -> deduplicate -> verify -> persist
                                                                              -> dataset + evidence
```

## Quick start (dev fixtures, no API keys)

```bash
cp .env.example .env            # DEV_FIXTURES=true by default
docker compose up --build       # Postgres, Redis, API (:8000), worker
cd frontend && cp .env.local.example .env.local && npm install && npm run dev   # UI on :3000
```

Open http://localhost:3000, type any request, preview the plan, run it. Fixture mode uses clearly
labelled synthetic pages (`fixture://...`) so you can exercise the whole pipeline and UI offline.

Without Docker: `make infra`, then in `backend/`: `python -m venv .venv && pip install -r requirements.txt`,
`make api`, `make worker` (RQ needs macOS/Linux/WSL), and `make web`. Tests: `make test`.

## Going real

1. Set `DEV_FIXTURES=false`, `GEMINI_API_KEY`, `BRAVE_API_KEY`, and a real contact in `USER_AGENT`.
2. The LLM fallback extractor (`app/extract/llm.py`) has **not** been run against the live API in this
   scaffold - try it on your target sites and tune the prompt. Model name is configurable (`GEMINI_MODEL`).

## Layout

| Path | What it does |
|---|---|
| `backend/app/schemas/plan.py` | The constrained workflow DSL (the only thing the LLM may produce) |
| `backend/app/planner/` | Prompt -> plan, with one validation-repair retry |
| `backend/app/policy/source_policy.py` | Denylist, robots.txt, SSRF guard, per-domain throttle |
| `backend/app/engine/steps.py` | The 8 pipeline steps; each returns metrics shown in the UI |
| `backend/app/extract/` | Heuristic extractor first, LLM fallback second (cost control) |
| `backend/app/models/` | Workflow, Step, Source, Dataset, Record (JSONB), Evidence |
| `backend/app/api/routes.py` | Plans, workflows, records, evidence, CSV/JSON export |
| `frontend/` | Next.js App Router + Tailwind: prompt, plan preview, live progress, dataset grid, evidence panel |

## How key decisions work

- **Confidence** = 0.6 x completeness (fraction of fields filled) + 0.4 x grounding (fraction of evidence
  quotes found verbatim in the fetched page and containing the value). High >= 0.8, medium >= 0.5.
- **Dedup** = fuzzy match (rapidfuzz, threshold 90) on the plan's `identity_fields`, after stripping legal
  suffixes (Pvt, Ltd, Inc...). Merged records keep evidence from every corroborating source.
- **Permitted sources** = `SourcePolicy`. It is checked at discovery and again on every redirect hop.

## Known gaps / next steps

- `create_all` on startup -> replace with Alembic migrations.
- No auth or per-user workflows yet (the data model is ready for a `users` table).
- RSS sources are accepted by the schema but not yet implemented.
- DNS-rebinding race in the SSRF guard (resolve-then-fetch); pin the resolved IP for production.
- Records grid is a plain table; swap in TanStack Table for sorting/column filters.
- Workflow steps are not resumable/retryable individually yet.
