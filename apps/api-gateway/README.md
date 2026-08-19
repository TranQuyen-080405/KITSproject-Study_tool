# API Gateway

The API Gateway is the public HTTP entry point for web and mobile clients. In V1 it forwards `/api/v1/*` requests to the existing backend services without owning application data or business logic.

## Local URL

- Gateway: `http://localhost:3000`
- Health check: `GET /health`

```json
{ "service": "api-gateway", "status": "ok" }
```

## Routes

| Public route prefix | Upstream service | Docker URL |
| --- | --- | --- |
| `/api/v1/auth/*` | User Service | `http://user-service:8000` |
| `/api/v1/users/*` | User Service | `http://user-service:8000` |
| `/api/v1/content/*` | Content Service | `http://content-service:3001` |
| `/api/v1/learning/*` | Learning Service | `http://learning-service:3002` |
| `/api/v1/analytics/*` | Analytics Service | `http://analytics-service:3003` |
| `/api/v1/ai/*` | AI Service | `http://ai-service:3004` |

The gateway preserves the original method, path, query string, headers, cookies, and request body stream when proxying.

## Development

```bash
pnpm --filter @korean-learning/api-gateway dev
```

Host-development defaults:

```env
PORT=3000
USER_SERVICE_URL=http://localhost:8001
CONTENT_SERVICE_URL=http://localhost:3001
LEARNING_SERVICE_URL=http://localhost:3002
ANALYTICS_SERVICE_URL=http://localhost:3003
AI_SERVICE_URL=http://localhost:3004
```

## Docker

```bash
docker compose up -d --build user-postgres user-service api-gateway
docker compose config
```

Inside Docker Compose, the gateway reaches services by Compose service name, for example `http://user-service:8000`.

## V1 Scope

Gateway V1 implements routing, health checks, unknown-route JSON 404 responses, and JSON 503 responses when a selected upstream cannot be reached.

JWT verification, rate limiting, caching, RabbitMQ integration, and backend business logic are not implemented in the Gateway.
