# Study AI Chatbot Service

All business APIs require a User Service bearer access token. Configure `USER_SERVICE_URL`
(local default `http://localhost:8001`; Docker `http://user-service:8000`). Health remains public.
See [service authentication](../../docs/service-auth.md) for account isolation and local setup.


A Dockerized chatbot application with three services:

```text
React/Vite frontend (5173) → FastAPI backend (3000) → PostgreSQL (5432)
```

The backend stores conversations and messages in PostgreSQL, builds a token-limited chat context, and calls the configured LLM through LangChain.

For the standalone AI Docker stack, start User Service on the host first. The backend uses
`AI_DOCKER_USER_SERVICE_URL` (default `http://host.docker.internal:8001`). In the demo frontend,
enter a valid User Service access token in the Access token field. Main web handles this automatically.

## Run after cloning

### 1. Prerequisites

```powershell
docker compose version
```

### 2. Create local environment configuration

```powershell
Copy-Item .env.example .env
```

Open `.env` and set at least these values:

```env
POSTGRES_PASSWORD=
LLM_API_KEY=
```

### 3. Build and start all services

```powershell
docker compose up --build
```

Open the application at [http://localhost:5173](http://localhost:5173).

Useful endpoints:

| URL | Purpose |
| --- | --- |
| [http://localhost:5173](http://localhost:5173) | React chatbot frontend |
| [http://localhost:3000/health](http://localhost:3000/health) | Backend and database health check |

On first startup, the backend automatically creates the `conversations` and `messages` tables in the PostgreSQL database.

## Stop and restart

Stop containers without deleting data:

```powershell
docker compose down
```

Start them again:

```powershell
docker compose up
```

To reset all local PostgreSQL data, run the following destructive command:

```powershell
docker compose down --volumes
```

## Configuration reference

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_DB` | No | Database name; defaults to `chatbot_service` |
| `POSTGRES_USER` | No | PostgreSQL user; defaults to `chatbot_user` |
| `POSTGRES_PASSWORD` | Yes | Password for the Docker PostgreSQL user |
| `POSTGRES_PORT` | No | Host PostgreSQL port; defaults to `5432` |
| `LLM_PROVIDER` | No | `openai` by default |
| `LLM_MODEL` | No | Model name passed to the LLM provider |
| `LLM_API_KEY` | Yes | Secret LLM provider API key |
| `LLM_BASE_URL` | No | Full URL for an OpenAI-compatible provider; leave empty for OpenAI |
| `LLM_TIMEOUT_SECONDS` | No | Per provider attempt timeout; default 30 seconds |
| `LLM_TOTAL_TIMEOUT_SECONDS` | No | Full model call deadline including fallbacks; default 45 seconds |
| `MAX_CONTEXT_MESSAGES` | No | Maximum recent messages added to context |
| `MAX_CONTEXT_TOKENS` | No | Approximate input token budget for context |

## Run without Docker

For local development, start PostgreSQL first, then use two terminals.

Backend:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 3000
```

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Set `VITE_API_URL=http://localhost:3000` in `frontend/.env`.


## Complete missing CSV flashcard sides

`POST /api/v1/ai/flashcards/complete` requires a bearer token and accepts up to 200 cards:

```json
{"cards":[{"index":0,"front":"물","back":""},{"index":1,"front":"","back":"Con mèo"}]}
```

It fills missing Korean fronts or Vietnamese backs, preserves existing cells, and returns completed
cards with the same indexes. AI processes at most 20 missing cards per model call. Duplicate, missing
or invalid AI completions fail the entire request with 502; this endpoint does not persist any cards.
The web CSV importer skips only rows with both sides empty, automatically completes missing sides on
Save, then sends all completed cards to Content in one batch. The preview also offers explicit AI completion.


## Generation batches and provider errors

`POST /api/v1/ai/questions/generate` supports `one_per_word: true` for deck tests.
Send 1–20 word objects with unique `vocabulary_id` values and `question_count` equal
to the number of words. The response must contain exactly one question per ID;
missing, duplicate or malformed questions fail the whole batch. General quiz generation
without this flag keeps its existing behavior. Content splits larger decks into batches
and saves the session only after every batch succeeds. Retakes reuse the saved questions.

Provider quota/rate limits return 429 (`AI_QUOTA_EXCEEDED` or `AI_RATE_LIMITED`),
provider authentication failures return 503, and model deadlines return 504.
SDK retries are disabled; Gemini fallbacks run only for connection, timeout or provider
server errors, within the full-call deadline. Quota 429 does not trigger fallback attempts.
Fix the provider quota/API key or wait for the provider limit to reset before trying again.

The server logs `ai_call` with task, model, elapsed milliseconds and error type/status,
without logging the API key or user prompt. CSV completion uses the same timeout/error behavior.
