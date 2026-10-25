import os
import sys
from pathlib import Path

# Add user-service root to python path
service_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(service_root))

from datetime import UTC, datetime
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.models import User, UserStatus

def get_candidates():
    candidates = []
    if os.environ.get("USER_DATABASE_URL"):
        candidates.append(os.environ["USER_DATABASE_URL"])
    
    # check apps/user-service/.env
    env_file = service_root / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("USER_DATABASE_URL="):
                candidates.append(line.split("=", 1)[1].strip())
    
    # standard fallbacks
    candidates.extend([
        "postgresql+psycopg://user_service_user:KITS2026@localhost:5432/user_service",
        "postgresql+psycopg://postgres:KITS2026@localhost:5432/user_service",
        "postgresql+psycopg://postgres:postgres@localhost:5432/user_service",
        "postgresql+psycopg://postgres:admin@localhost:5432/user_service",
        "postgresql+psycopg://postgres:root@localhost:5432/user_service",
    ])
    # Deduplicate while preserving order
    seen = set()
    result = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            result.append(c)
    return result

def verify(username: str):
    target = username.strip().lower()
    last_err = None
    
    for db_url in get_candidates():
        try:
            masked_url = db_url.split("@")[-1] if "@" in db_url else db_url
            engine = create_engine(db_url, pool_pre_ping=True)
            Session = sessionmaker(bind=engine, expire_on_commit=False)
            with Session() as db:
                user = db.scalar(select(User).where(func.lower(User.username) == target))
                if not user:
                    print(f"Connected to {masked_url}, but User '{target}' was not found in users table.")
                    # list some users to help
                    all_users = db.scalars(select(User.username)).all()
                    print(f"Existing users in DB: {all_users}")
                    sys.exit(1)
                
                user.status = UserStatus.ACTIVE
                user.email_verified_at = datetime.now(UTC)
                db.commit()
                db.refresh(user)
                print(f"[OK] User '{user.username}' (id={user.id}, email='{user.email}') has been successfully verified!")
                print(f"Status: {user.status.value}")
                print(f"Email verified at: {user.email_verified_at}")
                return
        except Exception as e:
            last_err = e
            continue
    
    print(f"Failed to connect to database. Last error: {last_err}")
    sys.exit(1)

if __name__ == "__main__":
    uname = sys.argv[1] if len(sys.argv) > 1 else "nvy175"
    verify(uname)
