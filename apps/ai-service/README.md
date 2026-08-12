# AI Service

This service will coordinate future external LLM-assisted learning content. Its data and business logic remain independent from other services.

## Development

```bash
pnpm install
pnpm dev
```

The service runs on port `3000` by default. Override it with `PORT`, for example
`PORT=4000 pnpm dev`. Health check: `GET /health`.
