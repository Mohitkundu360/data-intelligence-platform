from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/dataintel"
    redis_url: str = "redis://localhost:6379/0"
    cors_origins: str = "http://localhost:3000"

    openrouter_api_key: str = ""
    openrouter_model: str = "nvidia/nemotron-3.5-lightning:free"
    openrouter_extract_model: str = "liquid/lfm-2.5-2.6b:free"

    tavily_api_key: str = ""

    user_agent: str = "DataIntelBot/0.1 (+mailto:you@example.com)"
    per_domain_delay_seconds: float = 1.0
    max_pages_per_workflow: int = 40
    dev_fixtures: bool = False


settings = Settings()