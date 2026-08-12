from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta

from fastapi import BackgroundTasks, Cookie, Depends, FastAPI, HTTPException, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .config import settings
from .database import Base, engine, get_db
from .mailer import send_email
from .models import User, UserRole, UserStatus, UserVerificationToken, VerificationPurpose
from .schemas import (
    EmailRequest,
    GoogleRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    VerificationCodeRequest,
)
from .security import (
    create_access_token,
    get_current_user,
    hash_password,
    random_code,
    random_token,
    require_admin,
    token_hash,
    verify_password,
)


def now() -> datetime:
    return datetime.now(UTC)


def public_user(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "displayName": user.display_name,
        "emailVerified": user.email_verified_at is not None,
    }


def admin_user(user: User) -> dict:
    return {
        **public_user(user),
        "status": user.status.value,
        "role": user.role.value,
        "createdAt": user.created_at.isoformat(),
    }


def issue_refresh_token(user: User) -> str:
    token = random_token()
    user.refresh_token_hash = token_hash(token)
    user.refresh_token_expires_at = now() + timedelta(days=settings.refresh_token_days)
    return token


def issue_verification_token(
    db: Session,
    user: User,
    purpose: VerificationPurpose,
    lifetime_minutes: int,
) -> str:
    issued_at = now()
    active_tokens = db.scalars(
        select(UserVerificationToken).where(
            UserVerificationToken.user_id == user.id,
            UserVerificationToken.purpose == purpose,
            UserVerificationToken.used_at.is_(None),
        )
    )
    for active_token in active_tokens:
        active_token.used_at = issued_at

    code = random_code()
    db.add(
        UserVerificationToken(
            user_id=user.id,
            purpose=purpose,
            token_hash=token_hash(code),
            expires_at=issued_at + timedelta(minutes=lifetime_minutes),
        )
    )
    return code


def current_verification_token(
    db: Session,
    user: User,
    purpose: VerificationPurpose,
) -> UserVerificationToken | None:
    return db.scalar(
        select(UserVerificationToken)
        .where(
            UserVerificationToken.user_id == user.id,
            UserVerificationToken.purpose == purpose,
            UserVerificationToken.used_at.is_(None),
        )
        .order_by(UserVerificationToken.created_at.desc(), UserVerificationToken.id.desc())
        .limit(1)
    )


def token_response(user: User) -> dict:
    return {
        "accessToken": create_access_token(user),
        "expiresIn": settings.access_token_minutes * 60,
        "user": public_user(user),
    }


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        "refresh_token",
        token,
        max_age=settings.refresh_token_days * 86400,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax",
        path="/api/v1/auth",
    )


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="KITS User Service",
    version="1.0.0",
    description="Dịch vụ tài khoản và xác thực người dùng.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def http_error_handler(_, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "HTTP_ERROR", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"error": detail}, headers=exc.headers)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(_, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Dữ liệu đầu vào không hợp lệ",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


@app.get("/health", tags=["System"])
def health() -> dict:
    return {"status": "ok", "service": "user-service"}


@app.post("/api/v1/auth/register", status_code=201, tags=["Auth"])
def register(payload: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    email = payload.email.strip().lower()
    username = payload.username.strip().lower()
    existing = db.scalar(select(User).where(or_(User.email == email, User.username == username)))
    if existing and existing.email == email:
        raise HTTPException(409, detail={"code": "EMAIL_ALREADY_EXISTS", "message": "Email đã được đăng ký"})
    if existing:
        raise HTTPException(409, detail={"code": "USERNAME_ALREADY_EXISTS", "message": "Tên tài khoản đã tồn tại"})

    user = User(
        username=username,
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.displayName.strip(),
        role=UserRole.ADMIN if email in settings.admin_emails else UserRole.USER,
    )
    db.add(user)
    try:
        db.flush()
        code = issue_verification_token(
            db, user, VerificationPurpose.VERIFY_EMAIL, settings.verification_token_minutes
        )
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, detail={"code": "ACCOUNT_ALREADY_EXISTS", "message": "Tên tài khoản hoặc email đã tồn tại"})

    background_tasks.add_task(
        send_email,
        email,
        "Mã xác minh email KITS",
        f"Mã xác minh của bạn là: {code}\nMã có hiệu lực {settings.verification_token_minutes} phút.",
    )
    return {"user": public_user(user)}


@app.post("/api/v1/auth/verify-email", status_code=200, tags=["Auth"])
def verify_email(payload: VerificationCodeRequest, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or user.status == UserStatus.DELETED:
        raise HTTPException(404, detail={"code": "EMAIL_NOT_FOUND", "message": "Email không tồn tại trong hệ thống"})
    verification_token = current_verification_token(db, user, VerificationPurpose.VERIFY_EMAIL)
    if not verification_token or verification_token.expires_at <= now():
        raise HTTPException(401, detail={"code": "INVALID_CODE", "message": "Mã xác minh không đúng hoặc đã hết hạn"})
    if verification_token.token_hash != token_hash(payload.code):
        verification_token.attempt_count += 1
        db.commit()
        raise HTTPException(401, detail={"code": "INVALID_CODE", "message": "Mã xác minh không đúng hoặc đã hết hạn"})

    verification_token.used_at = now()
    user.email_verified_at = now()
    user.status = UserStatus.ACTIVE
    db.commit()
    return {
        "message": "Xác minh email thành công",
        "user": public_user(user),
    }


@app.post("/api/v1/auth/login", tags=["Auth"])
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.username == payload.username.strip().lower()))
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(401, detail={"code": "INVALID_CREDENTIALS", "message": "Tên tài khoản hoặc mật khẩu không đúng"})
    if user.status == UserStatus.PENDING_VERIFICATION:
        raise HTTPException(403, detail={"code": "EMAIL_NOT_VERIFIED", "message": "Email chưa được xác minh"})
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(403, detail={"code": "ACCOUNT_DISABLED", "message": "Tài khoản không hoạt động"})

    refresh_token = issue_refresh_token(user)
    db.commit()
    set_refresh_cookie(response, refresh_token)
    return token_response(user)


@app.post("/api/v1/auth/google", tags=["Auth"])
def google_login(payload: GoogleRequest, response: Response, db: Session = Depends(get_db)) -> dict:
    if not settings.google_client_id:
        raise HTTPException(503, detail={"code": "GOOGLE_AUTH_NOT_CONFIGURED", "message": "Google login chưa được cấu hình"})
    try:
        claims = id_token.verify_oauth2_token(payload.idToken, google_requests.Request(), settings.google_client_id)
    except ValueError:
        raise HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "Google ID token không hợp lệ"})
    if not claims.get("email_verified") or not claims.get("email") or not claims.get("sub"):
        raise HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "Google chưa xác minh email"})

    user = db.scalar(select(User).where(User.google_subject == claims["sub"]))
    if not user:
        email = claims["email"].strip().lower()
        user = db.scalar(select(User).where(User.email == email))
        if user:
            if user.google_subject and user.google_subject != claims["sub"]:
                raise HTTPException(
                    409,
                    detail={
                        "code": "GOOGLE_ACCOUNT_CONFLICT",
                        "message": "Email này đã liên kết với một tài khoản Google khác",
                    },
                )
            # Google has verified ownership of this email, so it is safe to link
            # the Google identity to the existing password account.
            user.google_subject = claims["sub"]
            user.email_verified_at = user.email_verified_at or now()
            if user.status == UserStatus.PENDING_VERIFICATION:
                user.status = UserStatus.ACTIVE
            active_tokens = db.scalars(
                select(UserVerificationToken).where(
                    UserVerificationToken.user_id == user.id,
                    UserVerificationToken.purpose == VerificationPurpose.VERIFY_EMAIL,
                    UserVerificationToken.used_at.is_(None),
                )
            )
            linked_at = now()
            for active_token in active_tokens:
                active_token.used_at = linked_at
        else:
            base_username = f"google_{claims['sub'][:20]}".lower()
            username = base_username
            suffix = 1
            while db.scalar(select(User).where(User.username == username)):
                username = f"{base_username[:45]}_{suffix}"
                suffix += 1
            user = User(
                username=username,
                email=email,
                display_name=claims.get("name") or email.split("@")[0],
                google_subject=claims["sub"],
                email_verified_at=now(),
                status=UserStatus.ACTIVE,
                role=UserRole.ADMIN if email in settings.admin_emails else UserRole.USER,
            )
            db.add(user)
            db.flush()
    if user.status != UserStatus.ACTIVE:
        raise HTTPException(403, detail={"code": "ACCOUNT_DISABLED", "message": "Tài khoản không hoạt động"})

    refresh_token = issue_refresh_token(user)
    db.commit()
    set_refresh_cookie(response, refresh_token)
    return token_response(user)


@app.post("/api/v1/auth/refresh", tags=["Auth"])
def refresh(
    payload: RefreshRequest | None,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> dict:
    raw_token = refresh_token or (payload.refreshToken if payload else None)
    if not raw_token:
        raise HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "Thiếu refresh token"})
    user = db.scalar(select(User).where(User.refresh_token_hash == token_hash(raw_token)))
    if (
        not user
        or not user.refresh_token_expires_at
        or user.refresh_token_expires_at <= now()
        or user.status != UserStatus.ACTIVE
    ):
        raise HTTPException(401, detail={"code": "INVALID_TOKEN", "message": "Refresh token không hợp lệ hoặc đã hết hạn"})

    new_refresh_token = issue_refresh_token(user)
    db.commit()
    set_refresh_cookie(response, new_refresh_token)
    return token_response(user)


@app.post("/api/v1/auth/logout", status_code=204, tags=["Auth"])
def logout(
    payload: RefreshRequest | None,
    response: Response,
    refresh_token: str | None = Cookie(default=None),
    db: Session = Depends(get_db),
) -> Response:
    raw_token = refresh_token or (payload.refreshToken if payload else None)
    if raw_token:
        user = db.scalar(select(User).where(User.refresh_token_hash == token_hash(raw_token)))
        if user:
            user.refresh_token_hash = None
            user.refresh_token_expires_at = None
            db.commit()
    response.delete_cookie("refresh_token", path="/api/v1/auth")
    response.status_code = 204
    return response


@app.post("/api/v1/auth/forgot-password", status_code=202, tags=["Auth"])
def forgot_password(payload: EmailRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower(), User.status != UserStatus.DELETED))
    if not user:
        raise HTTPException(404, detail={"code": "EMAIL_NOT_FOUND", "message": "Email không tồn tại trong hệ thống"})

    code = issue_verification_token(db, user, VerificationPurpose.RESET_PASSWORD, settings.reset_token_minutes)
    db.commit()
    background_tasks.add_task(
        send_email,
        user.email,
        "Mã đặt lại mật khẩu KITS",
        f"Mã đặt lại mật khẩu của bạn là: {code}\nMã có hiệu lực {settings.reset_token_minutes} phút.",
    )
    return {"message": "Hướng dẫn đặt lại mật khẩu đã được gửi"}


@app.post("/api/v1/auth/reset-password", status_code=200, tags=["Auth"])
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or user.status == UserStatus.DELETED:
        raise HTTPException(404, detail={"code": "EMAIL_NOT_FOUND", "message": "Email không tồn tại trong hệ thống"})
    reset_token = current_verification_token(db, user, VerificationPurpose.RESET_PASSWORD)
    if not reset_token or reset_token.expires_at <= now():
        raise HTTPException(401, detail={"code": "INVALID_CODE", "message": "Mã đặt lại mật khẩu không đúng hoặc đã hết hạn"})
    if reset_token.token_hash != token_hash(payload.code):
        reset_token.attempt_count += 1
        db.commit()
        raise HTTPException(401, detail={"code": "INVALID_CODE", "message": "Mã đặt lại mật khẩu không đúng hoặc đã hết hạn"})

    user.password_hash = hash_password(payload.newPassword)
    reset_token.used_at = now()
    user.refresh_token_hash = None
    user.refresh_token_expires_at = None
    db.commit()
    return {"message": "Đổi mật khẩu thành công, vui lòng đăng nhập lại"}


@app.get("/api/v1/users/me", tags=["Users"])
def get_me(user: User = Depends(get_current_user)) -> dict:
    return public_user(user)


@app.get("/api/v1/users/{user_id}", tags=["Users"])
def get_user(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    user = db.get(User, user_id)
    if not user or user.status == UserStatus.DELETED:
        raise HTTPException(404, detail={"code": "USER_NOT_FOUND", "message": "Không tìm thấy người dùng"})
    return admin_user(user)


@app.delete("/api/v1/users/{user_id}", status_code=200, tags=["Users"])
def delete_user(user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> dict:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(404, detail={"code": "USER_NOT_FOUND", "message": "Không tìm thấy người dùng"})
    db.delete(user)
    db.commit()
    return {
        "message": "Xóa người dùng thành công",
        "userId": user_id,
    }
