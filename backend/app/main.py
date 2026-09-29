from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.core.db import Base, engine
import app.models  # noqa: F401  (register tables)

# NOTE: create_all is fine for a scaffold; move to Alembic migrations before production.
Base.metadata.create_all(engine)

app = FastAPI(title="AI Data Intelligence Platform")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
                   allow_methods=["*"], allow_headers=["*"])
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "dev_fixtures": settings.dev_fixtures}
