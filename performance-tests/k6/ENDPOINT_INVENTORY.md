# Endpoint inventory

Inventory này được đối chiếu từ router/controller, API client và contract trong source. Mọi request k6 đi qua API Gateway; không gọi thẳng database hoặc business service.

## Target và authentication

- Gateway local: `http://localhost:3000`
- Frontend Vite `http://localhost:5173` không phải target của bộ test này.
- Các route `/api/v1/content`, `/api/v1/analytics`, `/api/v1/ai` và `/api/v1/users` yêu cầu `Authorization: Bearer <accessToken>`, ngoại trừ `GET /api/v1/ai/health`.
- Runner dùng `TEST_AUTH_TOKEN`, hoặc gọi login đúng một lần trong `setup()` bằng tài khoản test. Không login ở mỗi iteration.
- Nguồn xác minh chính: `apps/api-gateway/src/routes/index.ts`, `apps/api-gateway/src/auth.ts`, `apps/web/src/api/endpoints.ts`, router/controller của từng service.

## Endpoint dùng trong kịch bản mặc định

| Method | Path | Chức năng | Payload/query | Auth | Success | Kiểm tra | Rủi ro dữ liệu |
| --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/health` | Gateway liveness | Không | Không | 200 | `status === "ok"` | Không |
| POST | `/api/v1/auth/login` | Cấp access token | `{ username, password }` | Không | 200 | Có `accessToken`, `user.id` | Ghi refresh-token hash; chỉ gọi một lần |
| GET | `/api/v1/users/me` | Hồ sơ hiện tại | Không | Bearer | 200 | Có `id` | Không |
| GET | `/api/v1/content/flashcards` | Danh sách bộ thẻ | `folderId` tùy chọn; test không truyền | Bearer | 200 | `flashcards[]`, `count` | Không |
| GET | `/api/v1/content/flashcards/:id` | Chi tiết bộ thẻ đầu tiên | ID lấy từ response list | Bearer | 200 | ID khớp | Không; bỏ qua nếu list rỗng |
| GET | `/api/v1/analytics/dashboard` | Tổng quan tiến độ | Không | Bearer | 200 | `totalWords`, `dueNow` là số | Không |
| GET | `/api/v1/analytics/reviews/due` | Danh sách đến hạn | `limit=20&scope=due` | Bearer | 200 | `reviews[]`, `count` | Không |

## API đã xác minh nhưng không tải mặc định

### User service

| Method | Path | Success | Trạng thái |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | 201 | Loại: tạo user và gửi email |
| POST | `/api/v1/auth/verify-email` | 200 | Loại: thay đổi trạng thái |
| POST | `/api/v1/auth/google` | 200 | Loại: phụ thuộc Google token |
| POST | `/api/v1/auth/refresh` | 200 | Không cần trong test ngắn |
| POST | `/api/v1/auth/logout` | 204 | Loại: thu hồi refresh token |
| POST | `/api/v1/auth/forgot-password` | 202 | Loại: gửi email |
| POST | `/api/v1/auth/reset-password` | 200 | Loại: đổi mật khẩu/thu hồi token |
| GET | `/api/v1/users/:id` | 200 | Admin-only |
| DELETE | `/api/v1/users/:id` | 200 | Cấm: xóa user |

### Content service

| Resource | Methods và path đã xác minh | Success | Trạng thái |
| --- | --- | --- | --- |
| Folders | `POST/GET /folders`, `GET/PATCH/DELETE /folders/:id` | 200/201/204 | Chỉ GET an toàn; chưa cần cho journey |
| Flashcards | `POST/GET /flashcards`, `GET/PATCH/DELETE /flashcards/:id` | 200/201/204 | GET được dùng; mutation bị loại |
| Cards | `POST/GET /flashcards/:id/cards`, `GET/PATCH/DELETE /cards/:id` | 200/201/204 | Mutation bị loại |
| Questions | `POST/GET .../questions`, `GET/PATCH/DELETE /questions/:id`, `POST /questions/:id/check` | 200/201/204 | Không dùng; check có thể tạo side effect analytics |
| Lessons aliases | `POST/GET /lessons`, `GET/PATCH/DELETE /lessons/:id`, vocabulary routes | 200/201/204 | Đã xác minh, chưa cần vì trùng domain bộ thẻ |
| Deck tests | `GET/POST /flashcards/:id/test-sessions` và detail/answer/submit routes | 200/201 | POST/PUT bị loại: ghi dữ liệu, start có thể gọi AI |

### Analytics service

| Method | Path | Success | Trạng thái |
| --- | --- | --- | --- |
| GET | `/api/v1/analytics/reviews/queue` | 200 | Đã xác minh, không cần vì journey dùng `due` |
| GET | `/api/v1/analytics/reviews/deck?deckId=` | 200 | Cần fixture deck ID |
| GET | `/api/v1/analytics/sessions?limit=` | 200 | Read-only, có thể bổ sung sau |
| POST | `/api/v1/analytics/reviews` | 201 | Loại: ghi SRS |
| POST | `/api/v1/analytics/sessions` | 201 | Loại: ghi session/streak |
| POST | `/api/v1/analytics/sessions/submit` | 201 | Loại: ghi batch SRS/session/streak |

### AI service

| Method | Path | Success | Trạng thái |
| --- | --- | --- | --- |
| GET | `/api/v1/ai/health` | 200 | Public, xác minh được nhưng không thuộc journey chính |
| GET | `/api/v1/ai/conversations` | 200 | Read-only; loại khỏi mặc định để stack không bắt buộc AI |
| POST | `/api/v1/ai/conversations` | 201 | Loại: ghi dữ liệu |
| GET | `/api/v1/ai/conversations/:id` | 200 | Cần fixture conversation |
| DELETE | `/api/v1/ai/conversations/:id` | 204 | Cấm trong tải mặc định |
| POST | `/api/v1/ai/conversations/:id/messages` | 201 | Chỉ scenario `chat`, 3 request. Không nằm trong load GET. Không có streaming nên không đo time to first token |
| POST | `/api/v1/ai/flashcards/generate` | 200 | Loại: LLM |
| POST | `/api/v1/ai/flashcards/complete` | 200 | Loại: LLM |
| POST | `/api/v1/ai/questions/generate` | 200 | Loại: LLM |

## Chưa hỗ trợ hoặc chưa đủ fixture

| Method | Path | Trạng thái | Lý do |
| --- | --- | --- | --- |
| GET | `/api/v1/content/search` | `UNVERIFIED` | Gateway proxy test có nhắc nhưng content router không triển khai route này; không chạy |
| GET | `/api/v1/content/flashcards/:id` với ID cố định | `FIXTURE_REQUIRED` | Kịch bản lấy ID động từ list, không hardcode ID |
| AI streaming/SSE | `NOT_IMPLEMENTED` | Server gọi model với `disable_streaming=True` và trả một JSON. Scenario `chat` đo `chat_e2e_duration` bằng thời gian đủ body, không đo time to first token |

`MOBILE_ONLY=true` làm Gateway trả 404 cho Analytics/AI; bộ test yêu cầu Gateway đầy đủ. K6 HTTP đo backend API, không đo FPS, render React hay tương tác native Capacitor.
