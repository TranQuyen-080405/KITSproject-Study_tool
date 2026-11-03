# Build context is this directory. On Render, set Root Directory to apps/user-service.
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

EXPOSE 8000

CMD ["sh", "-c", "if [ \"$SEED_TEST_USER\" = \"true\" ]; then python scripts/seed_test_user.py; fi && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
