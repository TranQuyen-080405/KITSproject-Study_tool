from datetime import UTC, datetime

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import User, UserRole, UserStatus
from app.security import hash_password

USERNAME = "test"
EMAIL = "test@local.test"
PASSWORD = "test1234"
DISPLAY_NAME = "Test"


def main() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        by_email = db.scalar(select(User).where(User.email == EMAIL))
        by_username = db.scalar(select(User).where(User.username == USERNAME))
        if by_email and by_username and by_email.id != by_username.id:
            raise RuntimeError("Test username and email belong to different users")

        user = by_email or by_username
        if user is None:
            user = User(username=USERNAME, email=EMAIL, display_name=DISPLAY_NAME)
            db.add(user)

        user.username = USERNAME
        user.email = EMAIL
        user.display_name = DISPLAY_NAME
        user.password_hash = hash_password(PASSWORD)
        user.status = UserStatus.ACTIVE
        user.role = UserRole.USER
        user.email_verified_at = datetime.now(UTC)
        user.deleted_at = None
        user.refresh_token_hash = None
        user.refresh_token_expires_at = None
        db.commit()
        db.refresh(user)

        print(f"Seeded test user id={user.id} username={USERNAME} password={PASSWORD}")


if __name__ == "__main__":
    main()
