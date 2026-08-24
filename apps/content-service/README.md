# Content Service

Content Service quản lý bài học, từ vựng và câu hỏi trắc nghiệm. Service sở hữu
PostgreSQL riêng và không ghi trạng thái học/đã thuộc; việc đó thuộc Learning Service.

## Chạy bằng Docker

Từ thư mục gốc:

```bash
docker compose up -d --build content-service
```

- API trực tiếp: `http://localhost:3001`
- Qua Gateway: `http://localhost:3000/api/v1/content`
- PostgreSQL: `localhost:5434`, database `content_service`
- Health: `GET /health`

Container tự chạy `prisma migrate deploy` trước khi mở API.

Tạo/cập nhật bài học mẫu theo cách idempotent:

```bash
docker compose exec content-service \
  pnpm --filter @korean-learning/content-service seed:test
```

## Schema

- `Lesson`: tên, mô tả.
- `Vocabulary`: từ và nghĩa; mỗi từ thuộc một Lesson.
- `Question`: câu hỏi MCQ, đúng 4 lựa chọn, đáp án đúng và `vocabularyId` tùy chọn.

Một Lesson có nhiều Vocabulary và Question. Một Vocabulary có thể được nhiều
Question kiểm tra. Khi trả lời đúng, API chỉ trả `masteryCandidateVocabularyId`;
client/Learning Service dùng ID này để ghi nhận tiến độ sau này.
Xóa Lesson sẽ cascade Vocabulary/Question. Xóa Vocabulary giữ lại Question và
đặt `vocabularyId = NULL`.

## API

Tất cả endpoint nghiệp vụ có prefix `/api/v1/content`.

### Tạo và đọc bài học

```http
POST /api/v1/content/lessons
Content-Type: application/json

{
  "name": "Chào hỏi",
  "description": "Từ vựng giao tiếp cơ bản"
}
```

```http
GET /api/v1/content/lessons
GET /api/v1/content/lessons/:lessonId
```

### Thêm và liệt kê từ vựng

API nhận tối đa 100 từ/lần. Từ trùng trong cùng bài học trả `409`.

```http
POST /api/v1/content/lessons/:lessonId/vocabularies
Content-Type: application/json

{
  "items": [
    { "word": "안녕하세요", "meaning": "xin chào" },
    { "word": "감사합니다", "meaning": "cảm ơn" }
  ]
}
```

```http
GET /api/v1/content/lessons/:lessonId/vocabularies
```

### Tạo và liệt kê câu hỏi

Nếu có `vocabularyId`, từ đó bắt buộc thuộc bài học trên URL. Dùng
`"vocabularyId": null` cho câu hỏi tổng quát không gắn riêng với từ nào.

```http
POST /api/v1/content/lessons/:lessonId/questions
Content-Type: application/json

{
  "prompt": "안녕하세요 có nghĩa là gì?",
  "vocabularyId": "<id từ trong bài học>",
  "options": ["xin chào", "cảm ơn", "tạm biệt", "xin lỗi"],
  "correctOptionIndex": 0
}
```

```http
GET /api/v1/content/lessons/:lessonId/questions
```

Endpoint GET không trả `correctOptionIndex`.

### Chấm câu trả lời

```http
POST /api/v1/content/questions/:questionId/check
Content-Type: application/json

{ "selectedOptionIndex": 0 }
```

Đúng:

```json
{
  "correct": true,
  "masteryCandidateVocabularyId": "<vocabulary-id>"
}
```

Sai:

```json
{
  "correct": false,
  "masteryCandidateVocabularyId": null
}
```

## Test và contract tracking

```bash
corepack pnpm --filter @korean-learning/content-service typecheck
corepack pnpm --filter @korean-learning/content-service test:unit
corepack pnpm --filter @korean-learning/content-service test:integration
corepack pnpm --filter @korean-learning/content-service test:e2e
```

- Input: `tests/fixtures/inputs/*.json`
- Golden output: `tests/fixtures/expected_outputs/successful_flow.json`
- Báo cáo I/O live: `tests/logs/run_reports/report_latest.json` và file timestamp
  (gitignored)
- Chiến lược, Test Pyramid và TC-01…TC-07: `tests/README.md`
- Đổi `CONTENT_API_URL` để chạy contract test qua Gateway:

```bash
CONTENT_API_URL=http://localhost:3000/api/v1/content \
  corepack pnpm --filter @korean-learning/content-service test:e2e
```
