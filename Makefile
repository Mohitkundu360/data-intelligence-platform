.PHONY: infra api worker web test
infra:   ## start Postgres + Redis only
	docker compose up -d db redis
api:     ## run API locally (from backend/ venv)
	cd backend && uvicorn app.main:app --reload --port 8000
worker:  ## run job worker locally (macOS/Linux/WSL; not native Windows)
	cd backend && rq worker workflows --url $${REDIS_URL:-redis://localhost:6379/0}
web:
	cd frontend && npm run dev
test:
	cd backend && pytest -q
