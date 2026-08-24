# Web Client

React client for the Korean learning application. Browser requests use same-origin
`/api/v1/*` paths and always pass through the API Gateway.

## Connected flows

- Lesson catalogue: `GET /api/v1/content/lessons`
- MCQ lesson + grading: Content Service lesson/check endpoints
- Chatbot: AI Service conversation endpoints with `x-user-id` from the logged-in user
- Authentication: User Service login/register endpoints

Content grading currently calculates the result in Web. Persisting study progress
will move to Learning Service when its API is implemented.

## Local test account

```text
Username: test
Password: test1234
Email:    test@local.test
```

Create/update the account and sample lesson:

```powershell
docker compose up -d --build user-service content-service api-gateway web
docker compose exec user-service python scripts/seed_test_user.py
docker compose exec content-service pnpm --filter @korean-learning/content-service seed:test
```

Open `http://localhost:5173`.

## Development

```bash
corepack pnpm --filter @korean-learning/web dev
corepack pnpm --filter @korean-learning/web test
corepack pnpm --filter @korean-learning/web build
```
