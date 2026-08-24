# Analytics Service — hiện trạng (tham chiếu từ AI service)

Tài liệu mô tả **những gì đang có** trong `apps/analytics-service` tại thời điểm Docker setup.
Không phải đặc tả Learning Service; SRS/review hiện nằm trong Analytics (file JSON), chưa consume RabbitMQ.

---

## Tổng quan cấu trúc

```text
apps/analytics-service/
  src/
    index.ts          # lắng nghe PORT, shutdown SIGTERM/SIGINT
    app.ts            # Express + /health + mount /api/v1/analytics
    config/           # PORT, ANALYTICS_DATA_FILE
    routes/           # 3 HTTP routes
    controllers/      # validate request → service → repository
    services/         # scheduleReview (SM-2 rút gọn), toDueIn
    repositories/     # đọc/ghi JSON file
    events/           # stub (chưa có consumer)
  prisma/schema.prisma  # chỉ datasource; chưa có model
  fixtures/ + scripts/  # replay quiz results mẫu vào API
  Dockerfile
```

**Stack:** Node 22, Express 5, TypeScript (`tsx`), không Prisma client runtime.

**Lưu trữ hiện tại:** một file JSON (`ANALYTICS_DATA_FILE`, Docker: `/data/analytics.json`).
Postgres (`ANALYTICS_DATABASE_URL`) và RabbitMQ (`RABBITMQ_URL`) đã gắn trong Compose nhưng **chưa dùng trong code**.

---

## Luồng request

```text
Client / Gateway
  → GET|POST /api/v1/analytics/...
  → routes → controllers (validate)
  → services.scheduleReview (nếu ghi review)
  → repositories (JSON load/save)
```

Gateway proxy nguyên path: `http://localhost:3000/api/v1/analytics/*` → `analytics-service:3003`.

---

## API hiện tại

Base URL trực tiếp: `http://localhost:3003`  
Qua Gateway: `http://localhost:3000`

### `GET /health`

Healthcheck container / Compose.

```json
{ "service": "analytics-service", "status": "ok" }
```

---

### `POST /api/v1/analytics/reviews`

Ghi một lần trả lời quiz/ôn tập và cập nhật lịch SRS.

**Body (JSON)**

| Field | Bắt buộc | Kiểu | Ý nghĩa |
| --- | --- | --- | --- |
| `userId` | có | string | người học |
| `vocabularyId` | có | string | id từ / thẻ |
| `correct` | có | boolean | đúng / sai |
| `word` | không | string | nhãn hiển thị |
| `translation` | không | string | nghĩa |
| `reviewedAt` | không | ISO string | mặc định = now |

**Thành công:** `201`

```json
{
  "review": { /* ReviewRecord */ },
  "mastered": false
}
```

**Lỗi:** `400` — thiếu field, `reviewedAt` invalid, v.v.

---

### `GET /api/v1/analytics/reviews/due?userId=<id>&limit=<n>`

Danh sách item **đã đến hạn** (`nextReviewAt <= now`).

| Query | Bắt buộc | Mặc định | Giới hạn |
| --- | --- | --- | --- |
| `userId` | có | — | — |
| `limit` | không | `20` | 1–100 |

**Thành công:** `200`

```json
{
  "reviews": [ /* ReviewRecord[] sorted by nextReviewAt */ ],
  "count": 1
}
```

---

### `GET /api/v1/analytics/dashboard?userId=<id>`

Thống kê tổng hợp theo user.

**Thành công:** `200`

```json
{
  "totalWords": 1,
  "dueNow": 0,
  "learning": 1,
  "mastered": 0,
  "accuracy": 100,
  "nextReviewAt": "2026-08-24T21:27:14.719Z"
}
```

| Field | Cách tính |
| --- | --- |
| `totalWords` | số review record của user |
| `dueNow` | `toDueIn(record) === 0` |
| `learning` / `mastered` | đếm theo `status` |
| `accuracy` | `round(correctCount / totalReviews * 100)` (0 nếu chưa review) |
| `nextReviewAt` | `nextReviewAt` sớm nhất, hoặc `null` |

---

## Cơ chế SRS (`scheduleReview`)

Ilấy cảm hứng SM-2, rút gọn. Mỗi `(userId, vocabularyId)` = một `ReviewRecord`.

### Trạng thái

| `status` | Khi nào |
| --- | --- |
| `new` | record mới tạo (trước lần review đầu; sau lần đầu thường thành `learning`) |
| `learning` | đang học / streak &lt; 3, hoặc vừa sai |
| `mastered` | `correctStreak >= 3` |

### Khi `correct === false`

- `incorrectCount++`, `correctStreak = 0`
- `status = "learning"`
- `easeFactor = max(1.3, easeFactor - 0.2)`
- `intervalDays = 0`
- `nextReviewAt = now + 10 phút`

### Khi `correct === true`

- `correctCount++`, `correctStreak++`
- `easeFactor = min(3, easeFactor + 0.05)`
- Interval:
  - streak 1 → `1` ngày
  - streak 2 → `3` ngày
  - streak ≥ 3 → `max(4, round(intervalDays * easeFactor))` ngày
- `status = mastered` nếu streak ≥ 3, ngược lại `learning`
- `nextReviewAt = now + intervalDays` (ngày)

`easeFactor` khởi tạo `2.5`.

---

## Persistence (JSON file)

- Key: `` `${userId}::${vocabularyId}` ``
- File shape: `{ "reviews": { "<key>": ReviewRecord, ... } }`
- Load lazy lần đầu; ghi tuần tự qua queue + write temp rồi `rename` (tránh corrupt nửa file)
- Env: `ANALYTICS_DATA_FILE` (local mặc định `.analytics-data.json`, Docker `/data/analytics.json`)

### `ReviewRecord` (shape)

```ts
{
  userId, vocabularyId, word, translation?,
  status: "new" | "learning" | "mastered",
  correctCount, incorrectCount, correctStreak, totalReviews,
  intervalDays, easeFactor,
  nextReviewAt, lastReviewedAt  // ISO strings
}
```

---

## Chưa có (stub / TODO)

| Hạng mục | Trạng thái |
| --- | --- |
| Prisma models / migration | schema trống, chỉ `ANALYTICS_DATABASE_URL` |
| RabbitMQ consumer (`StudyCompleted`, …) | `src/events/index.ts` empty |
| Auth / JWT | không; tin `userId` từ client |
| UI demo trong service | README cũ nhắc UI; code không có |
| Sinh câu hỏi / quiz generation | **không** thuộc Analytics |

---

## Docker / chạy nhanh

```bash
docker compose up -d --build analytics-service
```

| Cổng | Việc |
| --- | --- |
| `3003` | Analytics API |
| `5437` | Postgres analytics (chưa dùng runtime) |
| `5672` / `15672` | RabbitMQ (chưa consume) |

Replay fixture mẫu:

```bash
node apps/analytics-service/scripts/replay-content-fixture.mjs
# POST từng event trong fixtures/content-service-results.json
```

---

## Lưu ý ranh giới kiến trúc

Roadmap team: Learning sở hữu session/SRS và publish event; Analytics chỉ build **read model dashboard** từ event, không đọc DB Learning.

**Code hiện tại** vẫn nhận review qua REST đồng bộ và tự schedule SRS — gần với “analytics + SRS demo” hơn là read-model thuần. Bước tiếp theo hợp lý: chuyển ghi review/SRS sang Learning, Analytics chỉ aggregate từ RabbitMQ + Prisma.
