#!/bin/sh
set -eu

export PYTHONUNBUFFERED=1
PUBLIC_PORT="${PORT:-10000}"

# These four processes live in this container. A leftover Render URL for an old
# separate user service would make the gateway report "User service unavailable".
export USER_SERVICE_URL="http://127.0.0.1:8000"
export CONTENT_SERVICE_URL="http://127.0.0.1:3001"
export ANALYTICS_SERVICE_URL="http://127.0.0.1:3003"
export AI_SERVICE_URL="http://127.0.0.1:3004"

if [ -z "${USER_DATABASE_URL:-}" ] || [ -z "${CONTENT_DATABASE_URL:-}" ] || [ -z "${DATABASE_URL:-}" ] || [ -z "${ANALYTICS_DATABASE_URL:-}" ]; then
  /opt/venv/bin/python /app/infrastructure/docker/all-in-one/prepare_databases.py
  set -a
  # shellcheck disable=SC1091
  . /tmp/service-db.env
  set +a
fi

start_bg() {
  name=$1
  shift
  "$@" &
  echo $! > "/tmp/service-$name.pid"
  echo "started $name pid $!"
}

cd /app
# Render shows Bad Gateway until $PORT accepts connections. Open it before the slow database work.
start_bg gateway env PORT="$PUBLIC_PORT" pnpm --filter @korean-learning/api-gateway exec tsx src/index.ts

# User service does not wait on Prisma. Login works while content and analytics migrate.
cd /app/apps/user-service
start_bg user env PORT=8000 /opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

cd /app/apps/ai-service
# LLM_PROVIDER, LLM_MODEL, LLM_API_KEY, and LLM_BASE_URL are the Render service env, not apps/ai-service/.env.
start_bg ai /opt/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 3004

cd /app
pnpm --filter @korean-learning/content-service db:deploy
pnpm --filter @korean-learning/analytics-service db:deploy

(cd /app/apps/user-service && PYTHONPATH=/app/apps/user-service /opt/venv/bin/python scripts/seed_test_user.py)
pnpm --filter @korean-learning/analytics-service exec tsx /app/scripts/seed-test-month.ts

start_bg content env PORT=3001 pnpm --filter @korean-learning/content-service start
start_bg analytics env PORT=3003 pnpm --filter @korean-learning/analytics-service start

# One crashed service must not exit this process. PID 1 exiting closes Render's port
# and the browser reports "Failed to fetch" even though login just worked.
trap 'kill 0; exit 0' TERM INT
set +e
while true; do
  for name in gateway user ai content analytics; do
    pidfile="/tmp/service-$name.pid"
    [ -f "$pidfile" ] || continue
    pid=$(cat "$pidfile")
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "$name stopped (pid $pid). The other services stay up."
      rm -f "$pidfile"
    fi
  done
  sleep 2
done
