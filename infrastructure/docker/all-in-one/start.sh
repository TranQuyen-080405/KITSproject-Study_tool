#!/bin/sh
set -eu

PUBLIC_PORT="${PORT:-10000}"

export USER_SERVICE_URL="${USER_SERVICE_URL:-http://127.0.0.1:8000}"
export CONTENT_SERVICE_URL="${CONTENT_SERVICE_URL:-http://127.0.0.1:3001}"
export ANALYTICS_SERVICE_URL="${ANALYTICS_SERVICE_URL:-http://127.0.0.1:3003}"
export AI_SERVICE_URL="${AI_SERVICE_URL:-http://127.0.0.1:3004}"

if [ -z "${USER_DATABASE_URL:-}" ] || [ -z "${CONTENT_DATABASE_URL:-}" ] || [ -z "${DATABASE_URL:-}" ] || [ -z "${ANALYTICS_DATABASE_URL:-}" ]; then
  /opt/venv/bin/python /app/infrastructure/docker/all-in-one/prepare_databases.py
  set -a
  # shellcheck disable=SC1091
  . /tmp/service-db.env
  set +a
fi

cd /app
# Render shows Bad Gateway until $PORT accepts connections. Open it before the slow database work.
PORT="$PUBLIC_PORT" pnpm --filter @korean-learning/api-gateway exec tsx src/index.ts &

pnpm --filter @korean-learning/content-service db:deploy
pnpm --filter @korean-learning/analytics-service db:deploy

(cd /app/apps/user-service && PYTHONPATH=/app/apps/user-service /opt/venv/bin/python scripts/seed_test_user.py)
pnpm --filter @korean-learning/analytics-service exec tsx /app/scripts/seed-test-month.ts

cd /app/apps/user-service
PORT=8000 /opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 &

cd /app/apps/ai-service
# LLM_PROVIDER, LLM_MODEL, LLM_API_KEY, and LLM_BASE_URL are the Render service env, not apps/ai-service/.env.
/opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 3004 &

cd /app
PORT=3001 pnpm --filter @korean-learning/content-service start &
PORT=3003 pnpm --filter @korean-learning/analytics-service start &

trap 'kill 0' TERM INT
wait
