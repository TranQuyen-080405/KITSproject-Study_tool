from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import router
from .config import get_settings
from .db import close_database, initialize_database
from .exceptions import register_exception_handlers

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await initialize_database()
    yield
    await close_database()


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
register_exception_handlers(app)
