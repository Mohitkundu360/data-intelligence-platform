"""The constrained workflow DSL. The LLM may only emit this shape; the backend
validates it and decides what is actually executed."""
import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

SNAKE = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


class FieldSpec(BaseModel):
    name: str
    description: str = ""
    required: bool = True

    @field_validator("name")
    @classmethod
    def _snake(cls, v: str) -> str:
        if not SNAKE.match(v):
            raise ValueError(f"field name must be snake_case: {v!r}")
        return v


class SourceSpec(BaseModel):
    type: Literal["search", "website", "rss"]
    query: str = Field(min_length=1, max_length=300)  # search terms, or a URL for website/rss


class FilterSpec(BaseModel):
    field: str
    operator: Literal["equals", "contains", "greater_than", "less_than"]
    value: str


class WorkflowPlan(BaseModel):
    objective: str = Field(min_length=5, max_length=500)
    target_count: int | None = Field(default=None, ge=1, le=500)
    fields: list[FieldSpec] = Field(min_length=1, max_length=20)
    sources: list[SourceSpec] = Field(min_length=1, max_length=10)
    filters: list[FilterSpec] = Field(default_factory=list, max_length=10)
    # Fields that together identify a real-world entity (used for deduplication).
    identity_fields: list[str] = Field(default_factory=list, max_length=4)

    @model_validator(mode="after")
    def _consistent(self) -> "WorkflowPlan":
        names = [f.name for f in self.fields]
        if len(set(names)) != len(names):
            raise ValueError("duplicate field names")
        for f in self.filters:
            if f.field not in names:
                raise ValueError(f"filter references unknown field {f.field!r}")
        for n in self.identity_fields:
            if n not in names:
                raise ValueError(f"identity field {n!r} is not a declared field")
        return self
