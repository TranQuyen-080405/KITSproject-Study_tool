"""Read pg_stat_activity counts. Prints one JSON object and no credentials."""

import json
import os

url = os.environ.get("SAMPLE_DATABASE_URL", "").strip()
if not url:
    print(json.dumps({"available": False, "reason": "SAMPLE_DATABASE_URL is not set"}))
    raise SystemExit(0)

try:
    import psycopg
except ImportError:
    print(json.dumps({"available": False, "reason": "psycopg is not installed"}))
    raise SystemExit(0)

try:
    with psycopg.connect(url, connect_timeout=2) as connection:
        rows = connection.execute(
            """
            SELECT datname, state, count(*)
            FROM pg_stat_activity
            WHERE datname IS NOT NULL
            GROUP BY datname, state
            ORDER BY datname
            """
        ).fetchall()
except Exception:
    print(json.dumps({"available": False, "reason": "database query failed"}))
    raise SystemExit(0)

print(
    json.dumps(
        {
            "available": True,
            "activity": [
                {"database": row[0], "state": row[1], "count": int(row[2])} for row in rows
            ],
        }
    )
)
