# Analytics Service

This service owns learning-result analysis and spaced repetition. Question generation remains outside this service.

Run `pnpm --filter @korean-learning/analytics-service dev`, then open `http://localhost:3003` for the English demo UI.

## API

- `POST /api/v1/reviews` with `userId`, `vocabularyId`, and boolean `correct`.
- `GET /api/v1/reviews/due?userId=<id>` for scheduled practice.
- `GET /api/v1/dashboard?userId=<id>` for aggregate results.
- `GET /health` for container health checks.

Mastery is automatic after three consecutive correct answers. An incorrect answer resets the streak and schedules the item again in ten minutes; mastered words remain in the review cycle with longer intervals.

## Docker

Build from repository root:

```bash
docker build -f apps/analytics-service/Dockerfile -t analytics-service .
docker run --rm -p 3003:3003 -v analytics-data:/data analytics-service
```
