# Analytics Service

Owns learning-result analysis and spaced-repetition scheduling for the dashboard. Question generation stays outside this service.

Persistence today is a JSON file (`ANALYTICS_DATA_FILE`). Postgres (`ANALYTICS_DATABASE_URL`) and RabbitMQ (`RABBITMQ_URL`) are wired in Compose for the later Prisma/event read-model work.

## Local

```bash
pnpm --filter @korean-learning/analytics-service dev
```

API base: `http://localhost:3003`

## API

- `POST /api/v1/analytics/reviews` — body: `userId`, `vocabularyId`, boolean `correct` (optional `word`, `translation`, `reviewedAt`)
- `GET /api/v1/analytics/reviews/due?userId=<id>` — due practice items
- `GET /api/v1/analytics/dashboard?userId=<id>` — aggregate stats
- `GET /health` — container health

Mastery after three consecutive correct answers. An incorrect answer resets the streak and reschedules in ten minutes; mastered words stay in the cycle with longer intervals.

Gateway clients use the same `/api/v1/analytics/*` paths via `http://localhost:3000`.

## Docker

From repository root:

```bash
docker compose up -d --build analytics-service
```

| URL | Purpose |
| --- | --- |
| http://localhost:3003/health | Direct health |
| http://localhost:3003/api/v1/analytics/dashboard?userId=demo | Direct API |
| http://localhost:3000/api/v1/analytics/dashboard?userId=demo | Via API Gateway |

Data volume: `analytics-data` → `/data/analytics.json`. Postgres is on host port `5437` for future migrations.
