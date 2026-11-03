import os
import shlex
from urllib.parse import urlparse, urlunparse

from psycopg import sql

DATABASES = ("user_service", "content_service", "ai_service", "analytics_service")


def normalize(url: str) -> str:
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://", "postgres://"):
        if url.startswith(prefix):
            return "postgresql://" + url[len(prefix) :]
    return url


def with_database(url: str, database: str, scheme: str) -> str:
    parsed = urlparse(normalize(url))
    rewritten = urlunparse(parsed._replace(path=f"/{database}"))
    return scheme + rewritten[len("postgresql://") :]


def main() -> None:
    source = os.environ.get("POSTGRES_URL", "").strip()
    if not source:
        raise SystemExit("Set POSTGRES_URL to the Render Internal Database URL.")
    admin_url = normalize(source)
    with psycopg_connect(admin_url) as connection:
        for name in DATABASES:
            exists = connection.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (name,),
            ).fetchone()
            if exists:
                continue
            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(name)))
    values = {
        "USER_DATABASE_URL": with_database(source, "user_service", "postgresql+psycopg://"),
        "CONTENT_DATABASE_URL": with_database(source, "content_service", "postgresql://"),
        "DATABASE_URL": with_database(source, "ai_service", "postgresql+asyncpg://"),
        "ANALYTICS_DATABASE_URL": with_database(source, "analytics_service", "postgresql://"),
    }
    with open("/tmp/service-db.env", "w", encoding="utf-8") as handle:
        for key, value in values.items():
            handle.write(f"{key}={shlex.quote(value)}\n")


def psycopg_connect(url: str):
    import psycopg

    return psycopg.connect(url, autocommit=True)


if __name__ == "__main__":
    main()
