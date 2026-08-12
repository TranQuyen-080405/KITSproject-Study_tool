from functools import lru_cache
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(
        default="postgresql+psycopg://postgres:postgres@user-postgres:5432/user_service",
        validation_alias="USER_DATABASE_URL",
    )
    jwt_secret: str = "change-me-in-production"
    jwt_issuer: str = "kits-user-service"
    jwt_audience: str = "kits-services"
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    verification_token_minutes: int = 60
    reset_token_minutes: int = 30
    google_client_id: str = ""
    admin_emails: Annotated[list[str], NoDecode] = ["admin@example.com"]
    frontend_url: str = "http://localhost:3000"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_from: str = ""
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = True
    secure_cookies: bool = False

    @field_validator("admin_emails", mode="before")
    @classmethod
    def parse_admin_emails(cls, value: object) -> object:
        if isinstance(value, str):
            return [item.strip().lower() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
