from functools import lru_cache
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "chatbot-service"
    host: str = "0.0.0.0"
    port: int = 3000
    database_url: str
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"
    llm_api_key: str = ""
    llm_base_url: str | None = None
    llm_temperature: float = 0.2
    max_context_messages: int = 12
    max_context_tokens: int = 6000
    frontend_origin: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("llm_base_url")
    @classmethod
    def validate_llm_base_url(cls, value: str | None) -> str | None:
        if not value:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("LLM_BASE_URL must be a full http(s) URL, for example https://api.openai.com/v1")
        return value.rstrip("/")


@lru_cache
def get_settings() -> Settings:
    return Settings()
