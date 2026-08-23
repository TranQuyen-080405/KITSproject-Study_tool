import logging

import asyncpg
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, SQLAlchemyError

logger = logging.getLogger(__name__)


def database_response(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail})


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(asyncpg.InvalidPasswordError)
    async def invalid_password_handler(_request: Request, error: asyncpg.InvalidPasswordError):
        logger.warning("PostgreSQL authentication failed: %s", error)
        return database_response(503, "PostgreSQL rejected the configured username or password.")

    @app.exception_handler(asyncpg.InvalidCatalogNameError)
    async def missing_database_handler(_request: Request, error: asyncpg.InvalidCatalogNameError):
        logger.warning("PostgreSQL database does not exist: %s", error)
        return database_response(503, "The database in DATABASE_URL does not exist.")

    @app.exception_handler(asyncpg.PostgresConnectionError)
    @app.exception_handler(OperationalError)
    async def connection_error_handler(_request: Request, error: Exception):
        logger.warning("PostgreSQL connection failed: %s", error)
        return database_response(503, "PostgreSQL is unavailable. Check host, port, and server status.")

    @app.exception_handler(asyncpg.PostgresError)
    @app.exception_handler(SQLAlchemyError)
    async def database_query_error_handler(_request: Request, error: Exception):
        logger.exception("Database query failed", exc_info=error)
        return database_response(500, "Database query failed. Check migrations and application logs.")
