# Korean Learning App

Ứng dụng học từ vựng tiếng Hàn hỗ trợ AI, đồng thời dùng để thực hành kiến trúc microservices và hệ thống phân tán.

## Phải khớp

| Yêu cầu | Giá trị |
| --- | --- |
| Package manager | **pnpm 10.14.0** (khai báo trong `package.json` → `packageManager`) |
| Lockfile | Giữ nguyên **`pnpm-lock.yaml`** — không xóa / regenerate tùy tiện |
| Node (Docker / khuyến nghị local) | **22** |
| PostgreSQL (Docker) | **17** |
| RabbitMQ (Docker) | **4** (`rabbitmq:4-management`) |
| Biến môi trường | Tên biến phải khớp **`.env.example`** |

Kiểm tra nhanh:

```bash
node -v
corepack pnpm -v
git --version
docker -v
docker compose version
```

Mong đợi: Node **22.x**, pnpm **10.14.0**, Git; Docker khi cần DB / RabbitMQ.

## Config cần setup

### 1. Công cụ trên máy

1. Cài **Git** + **Node.js 22.x**
2. Bật Corepack: `corepack enable`
3. (Khi cần Postgres / RabbitMQ) Cài **Docker Desktop**
4. Clone repo → cài dependency:

```bash
corepack pnpm install
```

### 2. File `.env`

Copy mẫu rồi chỉnh nếu cần:

```bash
copy .env.example .env
```

Các biến hiện có trong `.env.example` (giữ **đúng tên**):

| Biến | Mục đích |
| --- | --- |
| `API_GATEWAY_PORT` | Cổng API Gateway (mặc định `3000`) |
| `USER_SERVICE_PORT` / `USER_SERVICE_URL` | User Service |
| `CONTENT_SERVICE_PORT` / `CONTENT_SERVICE_URL` | Content Service |
| `CONTENT_SERVICE_TIMEOUT_MS` | Timeout gọi Content từ Gateway |
| `LEARNING_SERVICE_PORT` / `LEARNING_SERVICE_URL` | Learning Service |
| `ANALYTICS_SERVICE_PORT` / `ANALYTICS_SERVICE_URL` | Analytics Service |
| `USER_DATABASE_URL` | Postgres User Service (`…:5433/user_service`) |
| `CONTENT_DATABASE_URL` | Postgres Content Service (`…:5434/content_service`) |
| `LEARNING_DATABASE_URL` | Postgres Learning Service (`…:5435/learning_service`) |
| `AI_DATABASE_URL` | Postgres AI Service (`…:5436/ai_service`) |
| `ANALYTICS_DATABASE_URL` | Postgres Analytics Service (`…:5437/analytics_service`) |
| `RABBITMQ_URL` | RabbitMQ (`amqp://guest:guest@localhost:5672`) |

MVP hiện tại: nhiều service vẫn chạy mock / in-memory; `.env` chuẩn bị sẵn cho DB và queue khi bật Docker.

### 3. `developer.config.json`

Điền `coderName` (dùng khi ghi `docs/log.md`):

```json
{
  "coderName": "Tên của bạn"
}
```

### 4. Docker (khi cần DB / RabbitMQ)

Image trong `docker-compose.yml`:

- Node service image: **22** (`infrastructure/docker/Dockerfile.*`)
- Postgres: **17** (mỗi service một DB riêng)
- RabbitMQ: **4** (`rabbitmq:4-management`, UI `:15672`)

Ví dụ chỉ bật hạ tầng:

```bash
docker compose up user-postgres content-postgres learning-postgres ai-postgres analytics-postgres rabbitmq -d
```

## Chạy local (dev)

### Chạy đủ stack web hiện tại

Một terminal:

```bash
corepack pnpm run run:all
```

Hoặc:

```bash
.\scripts\run-all.cmd
```

```powershell
.\scripts\run-all.ps1
```

Khởi động: **User**, **Content**, **Learning**, **Analytics**, **API Gateway**, **Web**.

| Thành phần | URL / cổng |
| --- | --- |
| Web | http://localhost:5173/ |
| API Gateway | http://localhost:3000 |
| User Service | http://localhost:3001 |
| Content Service | http://localhost:3002 |
| Learning Service | http://localhost:3003 |
| Analytics Service | http://localhost:3005 |

### Chỉ chạy web

```bash
corepack pnpm --filter @korean-learning/web dev
```

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

- **API Gateway** — cổng vào công khai và định tuyến request
- **User Service** — xác thực, hồ sơ người dùng và tùy chọn học tập
- **Content Service** — bộ flashcard, thẻ flashcard và từ vựng
- **Learning Service** — bản ghi học, tiến độ, ôn tập và logic SRS
- **AI Service** — sinh nội dung / giải thích nhờ LLM bên ngoài
- **Analytics Service** — thống kê học tập theo sự kiện và dữ liệu dashboard

## Công nghệ sử dụng

React, React Native, Expo, Node.js, Express, TypeScript, PostgreSQL, Prisma, RabbitMQ, Vitest, Docker và Docker Compose.

## Cấu trúc repository

- `apps/` — web, mobile, gateway và các service tách biệt
- `packages/` — type, validation và tiện ích cấu hình dùng chung tối thiểu
- `assets/` — icon, hình nền dùng chung
- `infrastructure/` — Docker, RabbitMQ và PostgreSQL local
- `docs/architecture/` — quyền sở hữu service và ranh giới giao tiếp

## Các giai đoạn triển khai tiếp theo

1. Skeleton dự án
2. Xác thực (Authentication)
3. Quản lý flashcard
4. Học tập và SRS
5. Sinh nội dung bằng AI
6. Analytics theo sự kiện
7. Observability
8. Deployment
