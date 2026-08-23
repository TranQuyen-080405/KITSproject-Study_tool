# Study AI Chatbot Service

A Dockerized chatbot application with three services:

```text
React/Vite frontend (5173) → FastAPI backend (3000) → PostgreSQL (5432)
```

The backend stores conversations and messages in PostgreSQL, builds a token-limited chat context, and calls the configured LLM through LangChain.

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
