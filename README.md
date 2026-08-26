# Lệnh chạy

## Local (không Docker) — Node apps

Cần Postgres local/Docker cho Content (và User/AI nếu dùng). Chỉ UI:

```bash
corepack pnpm --filter @korean-learning/web dev
```

Chạy song song Web + Gateway + Content + Analytics (`run:all`):

```bash
corepack pnpm run:all
```

Chạy từng phần:

```bash
corepack pnpm run:web
corepack pnpm run:gateway
corepack pnpm run:content
corepack pnpm run:analytics
corepack pnpm run:user
corepack pnpm run:ai
corepack pnpm run:mobile
```

| Script | App | Port |
| --- | --- | --- |
| `run:all` | web + gateway + content + analytics | nhiều cổng |
| `run:web` | Web (Vite) | http://localhost:5173 |
| `run:gateway` | API Gateway | http://localhost:3000 |
| `run:content` | Content Service | http://localhost:3001 |
| `run:analytics` | Analytics Service | http://localhost:3003 |
| `run:user` | User Service (Python/`uvicorn`) | http://localhost:8001 |
| `run:ai` | AI Service (Python/`uvicorn`) | http://localhost:3004 |
| `run:mobile` | Mobile (Expo) | Expo CLI |

`run:user` / `run:ai` cần venv + dependency Python đã cài; Postgres tương ứng đang chạy.
## Web + auth stack (Docker)

```bash
docker compose up -d --build web
```

Mở http://localhost:5173 — nginx phục vụ UI và proxy `/api` → API Gateway →
User/Content/AI Service.

Tạo dữ liệu local để test Web (user `test` / `test1234` cũng được seed tự động khi
`user-service` start với `SEED_TEST_USER=true` — mặc định trong docker-compose):

```bash
docker compose exec user-service python scripts/seed_test_user.py
docker compose exec content-service pnpm --filter @korean-learning/content-service seed:test
```

Đăng nhập: username `test`, password `test1234`.

## AI Service (Docker)

```bash
docker compose up -d --build ai-service
```

| URL | Mục đích |
| --- | --- |
| http://localhost:3004/health | AI API health |
| http://localhost:3000/api/v1/ai/health | Qua API Gateway |
| http://localhost:5173 | Chatbot trong Web (client chính) |

UI demo AI riêng (không chạy mặc định):

```bash
docker compose --profile demo up -d --build ai-service-frontend
```

| http://localhost:8081 | Chatbot UI test trong AI service |

Chatbot UI local (hot reload), backend Docker vẫn ở `:3004`:

```bash
cd apps/ai-service/frontend
npm install
npm run dev
```

Mở http://localhost:5174 — Vite proxy `/conversations` và `/health` tới AI API.

Cần `LLM_API_KEY` (Groq) trong `.env`. Mặc định dùng `qwen/qwen3.6-27b` (chat thuần). Tránh `openai/gpt-oss-20b` cho chatbot — model này hay lỗi `tool_use_failed` trên Groq.

## Analytics Service (Docker)

```bash
docker compose up -d --build analytics-service
```

| URL | Mục đích |
| --- | --- |
| http://localhost:3003/health | Analytics API health |
| http://localhost:3003/api/v1/analytics/dashboard?userId=demo | Dashboard trực tiếp |
| http://localhost:3000/api/v1/analytics/dashboard?userId=demo | Qua API Gateway |

Postgres analytics: `localhost:5437`. Hiện service lưu review vào volume JSON; DB/RabbitMQ đã gắn sẵn cho bước Prisma/event sau.


# Korean Learning App

Ứng dụng học từ vựng tiếng Hàn hỗ trợ AI, đồng thời dùng để thực hành kiến trúc microservices và hệ thống phân tán.

## Tính năng chính

1. Sinh từ vựng bằng AI
2. Tạo và quản lý flashcard
3. Chế độ học flashcard
4. Theo dõi trạng thái thuộc / chưa thuộc
5. Ôn tập hàng ngày theo SRS
6. Theo dõi tiến độ học
7. Dashboard
8. Quiz ôn tập do AI tạo

## Kiến trúc hệ thống

```text
Web / Mobile
      ↓
API Gateway
      ↓
Microservices
      ↓
Database do từng service sở hữu

Sự kiện học tập
      ↓
RabbitMQ
      ↓
Analytics
```

## Các service

- **API Gateway** — cổng vào công khai và định tuyến request (sau này).
- **User Service** — xác thực, hồ sơ người dùng và tùy chọn học tập.
- **Content Service** — bộ flashcard, thẻ flashcard và từ vựng.
- **AI Service** — sinh nội dung / giải thích nhờ LLM bên ngoài (sau này).
- **Analytics Service** — review/SRS nhẹ, thống kê học tập và dữ liệu dashboard.

## Công nghệ sử dụng

React, React Native, Expo, Node.js, Express, TypeScript, PostgreSQL, Prisma, RabbitMQ, Vitest, Docker và Docker Compose.

## Cấu trúc repository

- `apps/` — web, mobile, gateway và các service tách biệt.
- `packages/` — type, validation và tiện ích cấu hình dùng chung tối thiểu.
- `infrastructure/` — chỗ chuẩn bị Docker, RabbitMQ và PostgreSQL local.
- `docs/architecture/` — mô tả quyền sở hữu service và ranh giới giao tiếp.

## Các giai đoạn triển khai tiếp theo

1. Skeleton dự án
2. Xác thực (Authentication)
3. Quản lý flashcard
4. Học tập và SRS
5. Sinh nội dung bằng AI
6. Analytics theo sự kiện
7. Observability
8. Deployment
