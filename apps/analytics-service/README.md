# Analytics Service

Analytics lưu reviews, study sessions và streaks trong **PostgreSQL**, qua Prisma 7 và pg adapter.
Các API hiện có giữ nguyên đường dẫn và định dạng dữ liệu; ngày giờ vẫn trả ISO string.
Runtime không còn đọc/ghi file JSON.

## Chạy local

Cài dependency ở root, sau đó chạy:

```powershell
corepack pnpm install
corepack pnpm --filter @korean-learning/analytics-service prisma:generate
corepack pnpm --filter @korean-learning/analytics-service db:deploy
corepack pnpm --filter @korean-learning/analytics-service db:import-json
corepack pnpm run:analytics
```

`run.cmd` cũng đã được cập nhật để generate client, chạy migration và nhập JSON cũ trước khi start.

Đặt `ANALYTICS_DATABASE_URL` trong môi trường hoặc file `.env` ở root/service:

```dotenv
ANALYTICS_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/analytics_service
```

Dùng thông tin đăng nhập phù hợp với PostgreSQL của bạn. Khi dùng database từ Docker Compose
trên host, cổng mặc định là 5437; trong mạng Docker, host là analytics-postgres:5432.

Thứ tự cấu hình: biến môi trường ANALYTICS_DATABASE_URL → root .env ANALYTICS_DATABASE_URL →
service .env ANALYTICS_DATABASE_URL → service .env DATABASE_URL → default localhost:5432/analytics_service.
Không lấy DATABASE_URL toàn cục vì biến đó thuộc AI Service trong workspace này.

## Migration và nhập lịch sử JSON

- Prisma migrations nằm trong `prisma/migrations`; `db:deploy` dùng migrate deploy, không reset DB.
- `scripts/import-json.ts` chuyển reviews, sessions và streaks sang PostgreSQL trong một transaction.
- Giữ nguyên ID session, cardId/vocabularyId, bộ đếm và thời điểm lịch sử.
- File JSON gốc được giữ nguyên. Import không phải là đường lưu dữ liệu runtime.
- Chạy lại chỉ thêm bản ghi chưa có; không ghi đè tiến độ đã được cập nhật trong PostgreSQL.
- Nếu nhập nhiều file có snapshot trùng, chọn snapshot mới nhất trước khi insert.
- Dữ liệu không hợp lệ làm import dừng trước khi ghi, không bỏ qua âm thầm.

Mặc định import file apps/analytics-service/.analytics-data.json hoặc đường dẫn ANALYTICS_DATA_FILE.
Nếu không có file mặc định thì bỏ qua. Có thể truyền nhiều file rõ ràng; đường dẫn tương đối
được tính từ thư mục chạy command trong service:

```powershell
cd apps/analytics-service
corepack pnpm db:import-json --dry-run
corepack pnpm db:import-json .analytics-data.json ../../.analytics-data.json
```

Khi chuyển hệ thống đang chạy, dừng tiến trình Analytics cũ trước khi lấy snapshot JSON,
chạy migration/import rồi khởi động phiên bản mới. Giữ file gốc để đối chiếu/backup.

## API

Base trực tiếp: http://localhost:3003. Gateway giữ nguyên /api/v1/analytics/*.

- POST /api/v1/analytics/reviews
- POST /api/v1/analytics/sessions
- POST /api/v1/analytics/sessions/submit
- GET /api/v1/analytics/reviews/due?userId=...
- GET /api/v1/analytics/reviews/queue?userId=...
- GET /api/v1/analytics/reviews/deck?userId=...&deckId=...
- GET /api/v1/analytics/sessions?userId=...
- GET /api/v1/analytics/dashboard?userId=...
- GET /health — SELECT 1 trên PostgreSQL; trả database: ok hoặc HTTP 503 khi DB không truy vấn được.

Các ghi nhận review/session dùng transaction và khóa theo user trong PostgreSQL để tránh mất cập nhật.
Batch kiểm tra toàn bộ payload trước khi ghi; session, reviews và streak được commit cùng nhau.
Quy tắc ôn tập hiện có: 3 lượt đúng liên tiếp là mastered, sai hẹn ôn lại sau 10 phút.

## Docker

```powershell
docker compose up -d --build analytics-service
```

Container chạy migration và import JSON trước khi start. Volume analytics-data vẫn được giữ
để đọc dữ liệu cũ tại /data/analytics.json; dữ liệu mới nằm trong analytics-postgres-data.

RabbitMQ currently has no consumer. Content AI-test session synchronization remains a separate task.
All Analytics business routes now require a bearer token, validated through USER_SERVICE_URL.
The account ID comes from the verified token; client-supplied userId is ignored.
See [service authentication](../../docs/service-auth.md).

## Kiểm thử

```powershell
corepack pnpm --filter @korean-learning/analytics-service typecheck
corepack pnpm --filter @korean-learning/analytics-service test
corepack pnpm --filter @korean-learning/analytics-service test:integration
```

Integration runner tạo schema ngẫu nhiên analytics_test_<uuid> trên PostgreSQL local,
chạy migration và kiểm thử rồi chỉ xóa schema test đó. Không chạy trên DB từ xa.
Các kiểm thử xác nhận lưu qua client mới, hợp đồng API, rollback, cập nhật đồng thời,
nhập JSON lặp lại và health khi DB gặp lỗi.
