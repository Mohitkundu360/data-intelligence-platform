import json

from pydantic import ValidationError

from app.core.config import settings
from app.schemas.plan import WorkflowPlan

SYSTEM = """You convert a business data-collection request into a JSON workflow plan.

Output ONLY valid JSON matching this schema:
{schema}

Rules:
- field names must be snake_case.
- mark a field required only if a record is useless without it.
- sources: prefer 2-4 diverse "search" queries.
- Use "website"/"rss" only if the user explicitly gives a URL.
- Never invent URLs.
- filters may only reference declared fields.
- identity_fields are the fields that identify one real-world entity.
- target_count should only be included if the user stated or clearly implied a number.
- Understand the user's actual request. Do not assume the task is about jobs unless the user asks for jobs.
"""


class PlannerError(Exception):
    pass


def _fixture_plan(prompt: str) -> WorkflowPlan:
    return WorkflowPlan.model_validate({
        "objective": prompt[:200] or "Find backend engineering jobs",
        "target_count": 20,
        "fields": [
            {"name": "company_name", "description": "Hiring company", "required": True},
            {"name": "job_title", "description": "Role title", "required": True},
            {"name": "location", "description": "City or Remote", "required": True},
            {"name": "salary", "description": "Salary if stated", "required": False},
            {"name": "application_url", "description": "Apply link", "required": True},
        ],
        "sources": [{"type": "search", "query": "backend engineer jobs India"}],
        "filters": [],
        "identity_fields": ["company_name", "job_title"],
    })


def _extract_json(text: str) -> str:
    """Remove accidental markdown code fences around JSON."""
    text = text.strip()

    if text.startswith("```"):
        lines = text.splitlines()

        if lines and lines[0].startswith("```"):
            lines = lines[1:]

        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]

        text = "\n".join(lines).strip()

    return text


def plan_from_prompt(prompt: str) -> WorkflowPlan:
    prompt = prompt.strip()

    if not prompt:
        raise PlannerError("Prompt is empty.")

    if not settings.openrouter_api_key:
        if settings.dev_fixtures:
            return _fixture_plan(prompt)

        raise PlannerError("OPENROUTER_API_KEY is not set.")

    try:
        from openai import OpenAI
    except ImportError as exc:
        raise PlannerError(
            "OpenAI Python package is not installed. "
            "Add 'openai' to backend dependencies."
        ) from exc

    client = OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )

    system = SYSTEM.format(
        schema=json.dumps(WorkflowPlan.model_json_schema())
    )

    contents = prompt
    last_err = ""

    for _ in range(2):
        try:
            response = client.chat.completions.create(
                model=settings.openrouter_model,
                messages=[
                    {
                        "role": "system",
                        "content": system,
                    },
                    {
                        "role": "user",
                        "content": contents,
                    },
                ],
                temperature=0.2,
            )

            text = response.choices[0].message.content or ""
            text = _extract_json(text)

            try:
                return WorkflowPlan.model_validate_json(text)

            except (ValidationError, ValueError) as exc:
                last_err = str(exc)
                contents = (
                    f"{prompt}\n\n"
                    f"Your previous output was invalid:\n"
                    f"{last_err[:1200]}\n\n"
                    "Return ONLY corrected JSON matching the required schema."
                )

        except Exception as exc:
            raise PlannerError(
                f"OpenRouter request failed: {str(exc)[:500]}"
            ) from exc

    raise PlannerError(
        f"Planner produced an invalid plan: {last_err[:500]}"
    )