FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app

WORKDIR /app

COPY apps/user-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY apps/user-service/app ./app
COPY apps/user-service/scripts ./scripts

EXPOSE 8000

# Seed test user when SEED_TEST_USER=true (docker-compose local), then start API.
CMD ["sh", "-c", "if [ \"$SEED_TEST_USER\" = \"true\" ]; then python scripts/seed_test_user.py; fi && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]

