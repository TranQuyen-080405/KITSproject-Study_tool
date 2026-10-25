# Kiểm tra Analytics Service — 24/10/2026

> Auth update 25/10/2026: Analytics, Content, AI and Gateway now validate bearer tokens with User Service.
> Analytics uses the verified account ID; the auth findings below describe the earlier audit state.
> See [service-auth.md](service-auth.md).


> Cập nhật 25/10/2026: storage đã được chuyển sang PostgreSQL/Prisma. Đã thêm migration,
> import JSON lặp lại an toàn, transaction cho session/reviews/streak và kiểm tra kiểu dữ liệu batch.
> Các phát hiện phía dưới ghi nhận trạng thái tại thời điểm audit 24/10; phần JSON/writeQueue
> không còn là implementation hiện tại. Xem apps/analytics-service/README.md để chạy bản mới.


Kết luận: service đang chạy và các phép tính cơ bản hoạt động, nhưng chưa đủ tin cậy cho Dashboard hiện tại.

## Phạm vi và bằng chứng

- Đã đọc API, nghiệp vụ, repository, cấu hình, Dashboard và các luồng gửi dữ liệu từ web/Content Service.
- Service thực tế trả 200 tại `http://127.0.0.1:3003/health`.
- Gateway trả 200 cho Dashboard với một userId thử không tồn tại, không cần token.
- TypeScript và 9 test nghiệp vụ hiện có đều qua.
- Các tình huống ghi dữ liệu dưới đây chạy trên một Express app riêng ở cổng ngẫu nhiên,
  dùng file JSON thử trong `.run-logs`; không gửi request ghi đến service thật đang chạy.
- Kết quả chi tiết: `.run-logs/analytics-audit-summary.json`.
- Lượt kiểm tra này không sửa mã nghiệp vụ hoặc dữ liệu thật.

## Các vấn đề theo ưu tiên

### 1. P1 — Bài kiểm tra AI mới chưa được chuyển sang Analytics

`apps/web/src/components/deck-test-panel.tsx` gửi bài đến Content Service.
`apps/content-service/src/services/deck-tests.ts` lưu session/đáp án/điểm nhưng chưa gọi Analytics hoặc phát sự kiện.
`apps/analytics-service/src/events/index.ts` hiện chỉ là placeholder.

Vì vậy, một bài kiểm tra AI có thể hoàn thành và xuất hiện trong lịch sử deck nhưng không tăng totalSessions,
không cập nhật streak, tiến độ ôn hoặc độ chính xác trên Dashboard.
Đây là phần tích hợp còn thiếu trong luồng kiểm tra mới được thêm ở các lượt trước.

Cần chuyển kết quả đã hoàn thành từ Content sang Analytics bằng ID session nguồn.
Phải chống xử lý trùng và có cơ chế thử lại khi Analytics tạm thời không chạy.

### 2. P1 — Analytics chưa xác thực danh tính người dùng

`apps/analytics-service/src/app.ts` gắn router trực tiếp, không có middleware xác thực.
Controller đọc userId từ query/body; Gateway chỉ proxy, không kiểm tra token.

Thử riêng: GET Dashboard không token trả 200; POST kết quả không token trả 201.
Có thể đọc/ghi dưới một userId tự chọn. Việc frontend gửi Bearer token chưa tạo ra kiểm soát ở backend.

Cần xác thực và xác định userId từ tài khoản đã kiểm chứng.
Luồng nội bộ Content → Analytics cũng cần cơ chế xác thực riêng phù hợp.

### 3. P1 — Gửi lại cùng kết quả bị tính thành nhiều lần học

`submitBatchSession` luôn tạo một session có ID mới và áp dụng lại từng review.
Không có khóa nhận diện request/session nguồn.

Đã gửi hai lần cùng một payload:
- Mong muốn khi thử lại một lượt gửi: 1 session.
- Thực tế: 2 session; mỗi thẻ tăng totalReviews lên 2.

Lỗi này làm sai tổng phiên, số lần ôn và có thể tăng trạng thái thuộc bài quá sớm.
Cần dùng sourceSessionId hoặc khóa chống trùng; vẫn cho phép một lần làm lại có ID riêng.

### 4. P1 — Lưu session/reviews/streak chưa phải một giao dịch

`apps/analytics-service/src/controllers/index.ts` lưu session trước, sau đó mới xử lý reviews và streak.
Khi bước sau lỗi, không hoàn tác phần đã lưu.

Đã gửi batch có cardId dạng số:
- API trả 400 với lỗi `item.cardId.trim is not a function`.
- Dashboard vẫn có 1 session, 0 review cho request thất bại đó.

Cần kiểm tra toàn bộ payload trước khi ghi, và lưu phiên/reviews/streak trong một transaction.
Comment “atomic-like” hiện không đảm bảo tính nguyên vẹn dữ liệu.

### 5. P1 — Batch chưa kiểm tra đúng kiểu dữ liệu review

Batch kiểm tra một số trường đầu vào cấp session nhưng không kiểm tra `item.correct` là boolean.

Đã gửi `correct: "false"`:
- API vẫn trả 201.
- Review được tính là đúng.
- Điểm session là 0% nhưng accuracy của Dashboard lại là 100%.

Cần kiểm tra từng review và tính các tổng từ dữ liệu đã kiểm chứng thay vì tin các tổng độc lập từ request.
Cũng cần ràng buộc sessionType, số nguyên không âm và thời điểm hợp lệ.

### 6. P2 — Streak lưu sẵn không tự hết hạn

`getDashboard` dùng thẳng `streakRecord.currentStreak` khi đã có record,
không so với lastStudiedDate và ngày hiện tại.

Đã tạo một lượt học cách hiện tại 7 ngày: Dashboard vẫn trả streakDays = 1, thay vì 0.

Cần tính hiệu lực của streak khi đọc; dùng thống nhất múi giờ cho việc xác định ngày học.

### 7. P2 — Hoạt động theo ngày chưa giữ đủ lịch sử và đang dùng UTC

Heatmap tổng hợp từ `lastReviewedAt` của mỗi thẻ và thời điểm các session.
Review chỉ giữ thời điểm gần nhất, nên không thể khôi phục đầy đủ số lượt ôn trước đó.

Đã ôn cùng một thẻ qua API /reviews vào hai ngày:
- Có hoạt động ngày 21 và 22/10.
- Dashboard chỉ còn hoạt động ngày 22/10 từ review đó.

Ngoài ra, lượt học 00:30 ngày 24/10 ở UTC+7 được gộp vào ngày 23/10.
Dashboard lại hiển thị nhãn ngày theo giờ máy, dễ lệch ngày.

Cần thống nhất đơn vị “lượt học” (phiên hay từng lượt ôn), lưu lịch sử tương ứng,
và dùng múi giờ người dùng nhất quán giữa UI và backend.

### 8. P2 — Một lần ghi file lỗi có thể chặn các lần ghi sau

Repository dùng chuỗi `writeQueue.then(() => persist())` mà không phục hồi Promise đã reject.

Đã ép một lần ghi thất bại trên repository thử, sau đó đổi lại đường dẫn ghi hợp lệ:
lần lưu sau vẫn thất bại vì hàng đợi giữ trạng thái reject.

Cần phục hồi hàng đợi sau lỗi và tránh thay đổi dữ liệu trong bộ nhớ trước khi một thao tác thất bại.
Repository trả object dùng chung và scheduleReview sửa object tại chỗ cũng làm việc rollback khó hơn.

## Giới hạn lưu trữ hiện tại

Dữ liệu thực tế đang được lưu bằng JSON qua `ReviewRepository`.
ANALYTICS_DATABASE_URL/Prisma schema hiện chưa được dùng bởi repository, RabbitMQ chưa có consumer.
README đã mô tả đây là phần chuẩn bị cho tương lai; cấu hình DB/RabbitMQ không có nghĩa chúng đang hoạt động.

Flashcard study và daily review có gọi Analytics, nhưng lỗi gửi hiện chỉ được log hoặc bỏ qua.
Flashcard đánh dấu sessionSynced trước khi request thành công, nên thất bại có thể không được gửi lại.

## Thứ tự sửa đề xuất

1. Xác thực và hợp đồng nhận kết quả có ID nguồn.
2. Đồng bộ bài kiểm tra AI hoàn thành; chống trùng và thử lại.
3. Kiểm tra payload và lưu nguyên vẹn session/reviews/streak.
4. Sửa streak, lịch sử hoạt động và múi giờ.
5. Chọn cơ chế lưu bền vững, bổ sung kiểm thử HTTP/repository và các tình huống lỗi.

Phần cơ bản đã chạy đúng trong thử nghiệm: một session với hai từ (một đúng, một sai)
trả 201; Dashboard ghi 1 session, 2 từ, accuracy 50%, hai từ đang học.
9 test hiện tại chỉ phủ các trường hợp nghiệp vụ cơ bản, chưa phủ các lỗi tích hợp/liên quan lưu trữ bên trên.
