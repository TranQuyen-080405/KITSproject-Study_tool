"""Validate bearer tokens against the account service; never trust x-user-id."""
import httpx
from fastapi import HTTPException, Request
from starlette.responses import JSONResponse

from .config import get_settings


async def resolve_user(authorization: str | None) -> str:
    parts = (authorization or "").split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(401, detail="Authentication required")
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                get_settings().user_service_url.rstrip("/") + "/api/v1/users/me",
                headers={"Authorization": authorization},
            )
        if response.status_code in (401, 403):
            raise HTTPException(401, detail="Invalid access token")
        if response.status_code != 200:
            raise HTTPException(503, detail="User service unavailable")
        user_id = response.json().get("id")
        if type(user_id) is not int or user_id <= 0:
            raise ValueError("Invalid identity")
        return str(user_id)
    except (httpx.HTTPError, ValueError, TypeError, AttributeError):
        raise HTTPException(503, detail="User service unavailable") from None


async def authenticate(request: Request, call_next):
    if request.method == "OPTIONS" or (request.method == "GET" and request.url.path in ("/health", "/api/v1/ai/health")):
        return await call_next(request)
    try:
        request.state.user_id = await resolve_user(request.headers.get("authorization"))
    except HTTPException as error:
        return JSONResponse(status_code=error.status_code, content={"detail": error.detail})
    return await call_next(request)


def current_user_id(request: Request) -> str:
    return request.state.user_id
