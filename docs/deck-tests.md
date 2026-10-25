# Kiểm tra AI theo deck

Web giữ chức năng thêm/sửa thông tin deck, thêm từ và import CSV từ vựng.
Các form thêm/sửa/import câu hỏi đã được gỡ khỏi giao diện.

- Nút **Kiểm tra** trên deck tạo một câu hỏi AI cho mỗi thẻ và bắt đầu phiên mới.
- Chọn đáp án hiển thị đúng/sai ngay ở UI và lưu tạm trên trình duyệt theo tài khoản/session.
- Tự lưu nền cả danh sách đáp án sau mỗi 5 câu mới hoặc mỗi 15 giây nếu có thay đổi.
  Chuyển câu không cần chờ mạng; một thời điểm chỉ có một request lưu nền.
- Bấm **Nộp bài** gửi toàn bộ đáp án, backend tính điểm và hoàn tất session.
  Request nộp bài đợi request lưu nền đang chạy. Nếu lỗi, giữ bản nháp để thử nộp lại.
- Sau refresh, cùng trình duyệt có thể khôi phục cả đáp án chưa kịp đồng bộ.
  Thiết bị khác chỉ thấy phần đã đồng bộ. Bản nháp được xóa khi nộp thành công.
- Tab **Kiểm tra & lịch sử** liệt kê tất cả phiên của tài khoản trong deck, gồm phiên đang làm.
- Bấm phiên đã hoàn thành để xem điểm, câu hỏi, đáp án đúng và đáp án đã chọn.
- **Làm lại** tạo phiên có ID mới, giữ nguyên đề cũ, bỏ trống đáp án và không gọi AI.
- Bấm phiên đang làm để tiếp tục từ câu chưa trả lời đầu tiên.
- Câu hỏi/từ/nghĩa được lưu dưới dạng bản chụp; sửa hoặc xóa thẻ không sửa bài cũ.
- Tạo đề thất bại sẽ không lưu một đề thiếu câu hỏi. Có thể thử lại từ giao diện.
- Session mới nằm trong Content Service; lịch sử ôn Flashcard/Analytics hiện có vẫn riêng.
  Session cũ của Analytics không có bản chụp câu hỏi/đáp án nên không thể chuyển thành bài có thể làm lại.

## Cấu hình và cập nhật database

Content Service cần kết nối User Service để xác thực và AI Service để tạo đề:

```dotenv
USER_SERVICE_URL=http://localhost:8001
AI_SERVICE_URL=http://localhost:3004
```

Docker Compose đã đặt hai địa chỉ tương ứng trong mạng Docker.

Sau khi tải thay đổi, tạo lại Prisma client và thêm bảng session. Chạy trong
`apps/content-service`, với `CONTENT_DATABASE_URL` đã được nạp vào môi trường:

```powershell
corepack pnpm prisma:generate
corepack pnpm exec prisma db execute --config prisma.config.ts --file prisma/deck-test-sessions.sql
```

Đây là cập nhật chỉ thêm bảng/chỉ mục. Launcher `run.cmd` hiện có cũng đồng bộ
Prisma schema trước khi khởi động. Khởi động lại Content Service sau khi cập nhật.
Các API tạo câu hỏi cũ vẫn giữ để tương thích client khác; web không còn dùng các form đó.

## API mới

Các endpoint sau yêu cầu Bearer token; danh tính được xác thực qua User Service,
không lấy `userId` từ dữ liệu trình duyệt.

| Method | Path dưới /api/v1/content | Ý nghĩa |
| --- | --- | --- |
| GET | /flashcards/:deckId/test-sessions | Danh sách phiên của tài khoản |
| POST | /flashcards/:deckId/test-sessions | Tạo đề AI và phiên mới, body {} |
| POST | /flashcards/:deckId/test-sessions | Làm lại, body { "sourceSessionId": "..." } |
| GET | /flashcards/:deckId/test-sessions/:sessionId | Đề, đáp án, tiến độ và điểm |
| PUT | /flashcards/:deckId/test-sessions/:sessionId/answers | Lưu nền { "answers": [0, 1, null] }, chưa hoàn thành session |
| POST | /flashcards/:deckId/test-sessions/:sessionId/submit | Nộp { "answers": [0, 1, 2] }, tính điểm và hoàn thành |
| PUT | /flashcards/:deckId/test-sessions/:sessionId/answer | API từng câu cũ, giữ tương thích; web không dùng |

Backend chia deck thành các lô tối đa 20 thẻ, mỗi lô gửi một request tạo câu hỏi AI.
Các lô chạy lần lượt; kết quả phải có đúng một câu cho từng `vocabulary_id`, kể cả khi
các thẻ trùng từ. Chỉ lưu session sau khi tất cả các lô tạo đề thành công.
Hết quota/giới hạn AI trả về HTTP 429 với thông báo cụ thể; quá thời gian trả về 504.
AI Service không tự retry hay đổi model khi gặp quota 429.
Đáp án đã lưu không thay đổi; gửi lại cùng lựa chọn là thao tác an toàn khi mất kết nối.
Cập nhật đồng thời dùng version để tránh ghi đè tiến độ giữa các cửa sổ.
Hai API theo lô trả về `{ progress }` chỉ chứa đáp án, điểm, thời điểm hoàn thành và version;
không trả lại toàn bộ đề mỗi lần lưu. Mảng đáp án theo đúng thứ tự câu hỏi, null là chưa trả lời.
Bản lưu nền cũ không xóa các lựa chọn đã lưu; nộp bài phải đủ đáp án. Gửi lại cùng bản nộp
không đổi điểm/thời điểm hoàn thành. Backend bỏ qua điểm do trình duyệt gửi và tự tính lại.

## Kiểm thử

- `tests/deck-tests.test.ts`: tạo đề, lỗi AI, quyền truy cập, lưu/chấm, làm lại không AI và xung đột.
- `tests/integration/deck-tests.test.ts`: dữ liệu PostgreSQL, bản chụp sau xóa thẻ, phiên làm lại, cập nhật đồng thời.
  Chỉ chạy khi CONTENT_TEST_DATABASE_URL trỏ đến schema riêng dạng deck_tests_<32 ký tự hex>;
  bộ test xóa schema riêng đó sau khi hoàn tất.
- `apps/web/tests/deck-test-panel.test.tsx`: xem bài cũ, tạo một lần trong StrictMode,
  lưu theo ngưỡng/thời gian, không chặn chuyển câu, thứ tự lưu–nộp, thử nộp lại, kết quả và tiếp tục bài dở.
- `apps/web/tests/deck-test-draft.test.ts`: khôi phục, kiểm tra dữ liệu và tách bản nháp theo tài khoản/session.

Kiểm thử AI dùng dữ liệu giả để không phát sinh yêu cầu trả phí.

Chạy bộ tích hợp PostgreSQL riêng (tự đọc CONTENT_DATABASE_URL trong .env ở root nếu chưa có biến môi trường):

```powershell
node apps/content-service/tests/scripts/run-deck-tests-integration.mjs
```

Runner tạo schema test ngẫu nhiên trên PostgreSQL local, đồng bộ schema, chạy test rồi dọn schema test.
