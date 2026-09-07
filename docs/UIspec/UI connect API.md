# BẢN ĐỒ KẾT NỐI API & DANH SÁCH CÔNG VIỆC TÍCH HỢP CHO WEB CLIENT

> **Tài liệu Kỹ thuật**: UI Connect API Specification  
> **Dự án**: KITS Project - Study Tool (Korean Learning Platform)  
> **Nguồn API Contracts**:  
> - `apps/web/apiContract.csv`  
> - `apps/api-gateway/apiContract.csv`  
> - `apps/content-service/apiContract.csv`  
> - `apps/analytics-service/apiContract.csv`  
> - `apps/ai-service/apiContract.csv`  
> - `apps/user-service/API_CONTRACT.md`  
> **Vị trí tài liệu**: `docs/UIspec/UI connect API.md`  
> **Ngày cập nhật**: 2026-08-26  

---

## 1. TỔNG HỢP HỆ THỐNG API CONTRACTS TOÀN HỆ THỐNG (MICROSERVICES)

Hệ thống backend vận hành theo kiến trúc Microservices thông qua **API Gateway** (`http://localhost:8000`). Dưới đây là bảng tổng hợp hợp đồng API (API Contracts) từ tất cả các dịch vụ:

### 1.1. Auth & User Service (`/api/v1/auth/*` & `/api/v1/users/*`)
* **`POST /api/v1/auth/register`**: Đăng ký tài khoản (Cần `username`, `email`, `password`, `displayName`). Trả về thông tin user trạng thái `PENDING_VERIFICATION`.
* **`POST /api/v1/auth/verify-email`**: Xác minh email bằng mã OTP 6 chữ số (`email`, `code`).
* **`POST /api/v1/auth/login`**: Đăng nhập bằng `username` + `password`. Trả về `accessToken` (JWT 15 phút) + Đặt cookie `refresh_token` (`HttpOnly`).
* **`POST /api/v1/auth/google`**: Đăng nhập qua Google OAuth (`idToken`).
* **`POST /api/v1/auth/refresh`**: Làm mới access token dựa vào cookie `HttpOnly` hoặc body `refreshToken`.
* **`POST /api/v1/auth/logout`**: Hủy phiên đăng nhập và xóa cookie refresh token.
* **`POST /api/v1/auth/forgot-password`**: Yêu cầu gửi mã OTP quên mật khẩu qua email.
* **`POST /api/v1/auth/reset-password`**: Đặt lại mật khẩu mới (`email`, `code`, `newPassword`).
* **`GET /api/v1/users/me`**: Lấy thông tin chi tiết tài khoản hiện tại (`Authorization: Bearer <token>`).

### 1.2. Content Service (`/api/v1/content/*`)
* **`GET /api/v1/content/lessons`**: Lấy danh sách bài học công khai (`LessonSummary[]`).
* **`GET /api/v1/content/lessons/{lessonId}`**: Lấy chi tiết bài học (gồm từ vựng + danh sách câu hỏi trắc nghiệm không chứa `correctOptionIndex`).
* **`POST /api/v1/content/questions/{questionId}/check`**: Chấm điểm đáp án trắc nghiệm (`selectedOptionIndex`). Trả về `{ correct: boolean, masteryCandidateVocabularyId }`.
* **`POST /api/v1/content/lessons`**: [Admin/Manager] Tạo bài học mới (`name`, `description`).
* **`PATCH /api/v1/content/lessons/{lessonId}`**: [Admin/Manager] Cập nhật bài học.
* **`DELETE /api/v1/content/lessons/{lessonId}`**: [Admin/Manager] Xóa bài học.
* **`POST /api/v1/content/lessons/{lessonId}/vocabularies`**: Thêm danh sách từ vựng vào bài học (`items: [{ word, meaning }]`).
* **`GET /api/v1/content/lessons/{lessonId}/vocabularies`**: Lấy danh sách từ vựng của bài học.
* **`GET /api/v1/content/lessons/{lessonId}/questions/managed`**: [Admin/Manager] Lấy danh sách câu hỏi kèm đáp án đúng `correctOptionIndex`.
* **`POST /api/v1/content/lessons/{lessonId}/questions`**: Tạo câu hỏi mới (`prompt`, `options[4]`, `correctOptionIndex`, `vocabularyId?`).
* **`PATCH /api/v1/content/questions/{questionId}`**: Cập nhật câu hỏi.
* **`DELETE /api/v1/content/questions/{questionId}`**: Xóa câu hỏi.

### 1.3. Analytics Service (`/api/v1/analytics/*`)
* **`POST /api/v1/analytics/reviews`**: Ghi nhận kết quả ôn tập (`userId`, `vocabularyId`, `correct`, `word?`, `translation?`). Hệ thống tự động tính thuật toán Spaced Repetition (Ease factor, Interval, Next review date).
* **`GET /api/v1/analytics/reviews/due`**: Lấy danh sách từ vựng cần ôn tập ngay (`userId`, `limit?`).
* **`GET /api/v1/analytics/dashboard`**: Lấy chỉ số tổng quan tiến độ học tập (`userId`). Trả về `{ totalWords, dueNow, learning, mastered, accuracy, nextReviewAt }`.

### 1.4. AI Service (`/api/v1/ai/*`)
* **`GET /api/v1/ai/health`**: Kiểm tra trạng thái AI engine & LLM backend (`Header x-user-id`).
* **`POST /api/v1/ai/conversations`**: Tạo cuộc hội thoại mới với AI Trợ lý (`title?`, `Header x-user-id`).
* **`GET /api/v1/ai/conversations`**: Lấy danh sách cuộc hội thoại của user (`Header x-user-id`).
* **`GET /api/v1/ai/conversations/{conversation_id}`**: Lấy chi tiết lịch sử tin nhắn trong đoạn chat (`Header x-user-id`).
* **`DELETE /api/v1/ai/conversations/{conversation_id}`**: Xóa đoạn chat (`Header x-user-id`).
* **`POST /api/v1/ai/conversations/{conversation_id}/messages`**: Gửi tin nhắn cho AI (`content`, `Header x-user-id`). Trả về `{ user_message, assistant_message, provider, model }`.

---

## 2. ĐÁNH GIÁ HIỆN TRẠNG KẾT NỐI API TRÊN WEB CLIENT (`apps/web`)

Sau khi rà soát mã nguồn trong thư mục `apps/web/src`, hiện trạng kết nối như sau:

| Màn hình / Component | Trạng thái hiện tại | Vấn đề / Điểm cần hoàn thiện |
| :--- | :--- | :--- |
| **`LoginPage`** | Đã kết nối Auth Service (`login`, `google`, `logout`). | Chưa tích hợp UI luồng **Quên mật khẩu** (`forgot-password`, `reset-password`) và **Xác minh OTP** (`verify-email`). |
| **`LessonPage`** | Đã kết nối `GET /api/v1/content/lessons`. | Đã hoạt động mượt qua API Gateway. |
| **`McqPage`** | Đã kết nối `GET lesson detail` & `POST check answer`. | **Chưa gọi `POST /api/v1/analytics/reviews`** để ghi nhận tiến độ thuật toán Spaced Repetition khi người học làm xong bài! |
| **`DashboardPage`** | Đang gọi endpoint cũ/mock `/api/dashboard/word-correctness`. | **Chưa kết nối API chuẩn `GET /api/v1/analytics/dashboard?userId=...`** từ Analytics Service qua API Gateway. |
| **`ManageContentPage`** | Đã kết nối bài học, từ vựng và câu hỏi managed. | Đã kết nối đầy đủ các hàm CRUD content. |
| **`ChatbotPage`** | Đã kết nối AI Service qua `ai-api.ts`. | Đã hỗ trợ tạo conversation, gửi message và tự lưu `x-user-id`. |

---

## 3. DANH SÁCH CÁC BƯỚC CẦN LÀM ĐỂ KẾT NỐI TẤT CẢ FUNCTION (ACTIONABLE STEPS)

### BƯỚC 1: Chuẩn Hóa Endpoint Mapping & Tạo `analytics-api.ts`

1. Bổ sung các đường dẫn Analytics vào file `apps/web/src/api/endpoints.ts`:
   ```typescript
   // apps/web/src/api/endpoints.ts
   export const endpoints = {
     // ... existing endpoints
     analytics: {
       dashboard: (userId: string | number) =>
         `/api/v1/analytics/dashboard?userId=${encodeURIComponent(userId)}`,
       reviewsDue: (userId: string | number, limit = 20) =>
         `/api/v1/analytics/reviews/due?userId=${encodeURIComponent(userId)}&limit=${limit}`,
       recordReview: "/api/v1/analytics/reviews",
     },
   };
   ```

2. Tạo module `apps/web/src/api/analytics-api.ts` để bọc các API request dành cho Analytics Service:
   ```typescript
   import { apiRequest } from "./client";
   import { endpoints } from "./endpoints";

   export type AnalyticsDashboardData = {
     totalWords: number;
     dueNow: number;
     learning: number;
     mastered: number;
     accuracy: number;
     nextReviewAt: string | null;
   };

   export type RecordReviewPayload = {
     userId: string;
     vocabularyId: string;
     correct: boolean;
     word?: string;
     translation?: string;
   };

   export const analyticsApi = {
     async getDashboard(userId: string | number, token: string): Promise<AnalyticsDashboardData> {
       return apiRequest<AnalyticsDashboardData>(endpoints.analytics.dashboard(userId), {
         accessToken: token,
       });
     },
     async recordReview(payload: RecordReviewPayload, token: string): Promise<void> {
       await apiRequest(endpoints.analytics.recordReview, {
         method: "POST",
         body: payload,
         accessToken: token,
       });
     },
   };
   ```

---

### BƯỚC 2: Chuyển Đổi Màn Hình Dashboard Sang Analytics Service Thật (`DashboardPage.tsx`)

* **Thay đổi**: Loại bỏ `fetch("/api/dashboard/word-correctness")` trong `DashboardPage.tsx` và gọi `analyticsApi.getDashboard(account.id, token)`.
* **Hiển thị giao diện**:
  * Hiển thị 4 thẻ stat: **Tổng từ vựng (`totalWords`)**, **Cần ôn ngay (`dueNow`)**, **Đang học (`learning`)**, **Đã thành thục (`mastered`)**.
  * Hiển thị tỷ lệ chính xác `% (`accuracy`)** trên thanh tiến trình Emerald.

---

### BƯỚC 3: Đồng Bộ Ghi Nhận Tiến Độ Khi Làm MCQ (`McqPage.tsx`)

* **Thay đổi**: Khi người dùng nhấn "Xem kết quả" hoặc sau mỗi câu trả lời trong `McqPage.tsx`:
  1. Sau khi gọi `checkLessonAnswer(questionId, selectedOptionIndex)` nhận về `{ correct, masteryCandidateVocabularyId }`.
  2. Nếu có `masteryCandidateVocabularyId`, tự động kích hoạt API `analyticsApi.recordReview`:
     ```typescript
     if (res.masteryCandidateVocabularyId) {
       await analyticsApi.recordReview({
         userId: String(account.id),
         vocabularyId: res.masteryCandidateVocabularyId,
         correct: res.correct,
       }, token);
     }
     ```
  3. Điều này đảm bảo tiến độ học tập và thuật toán lặp lại ngắt quãng (Spaced Repetition) lập tức ghi nhận vào database của `analytics-service`.

---

### BƯỚC 4: Hoàn Thiện Luồng Xác Minh Email & Quên Mật Khẩu Trên `LoginPage.tsx`

1. **Luồng Xác minh Email**:
   * Khi `POST /api/v1/auth/register` thành công, chuyển UI sang Form nhập mã OTP 6 chữ số.
   * Gửi `POST /api/v1/auth/verify-email` với `{ email, code }` trước khi cho phép đăng nhập.
2. **Luồng Quên mật khẩu**:
   * Thêm liên kết *"Quên mật khẩu?"* mở dialog hoặc chuyển tab.
   * Bước 1: Nhập Email -> Gửi `POST /api/v1/auth/forgot-password`.
   * Bước 2: Nhập OTP + Mật khẩu mới -> Gửi `POST /api/v1/auth/reset-password`.

---

### BƯỚC 5: Tối Ưu Header & Quản Lý Phiên Đăng Nhập (Session Refresh Loop)

1. **Header `x-user-id` & `Authorization`**:
   * Đảm bảo mọi API call cần danh tính (AI Service, Analytics Service) đều truyền đúng `x-user-id` và Bearer Token thông qua `apiRequest` trong `apps/web/src/api/client.ts`.
2. **Auto Refresh Token trên 401**:
   * Cập nhật `client.ts`: Nếu gặp lỗi `401 Unauthorized`, tự động gọi `POST /api/v1/auth/refresh` 1 lần để lấy access token mới từ cookie `HttpOnly`, sau đó thử lại request bị lỗi.

---

## 4. TỔNG KẾT TIẾN ĐỘ THỰC HIỆN KẾT NỐI

```
[User Auth Flow]   ---> User Service (Register, Verify OTP, Login, Refresh, Reset Pass)
[Lesson & Content] ---> Content Service (Lessons, Vocabs, Questions, Check Answer)
[Study Progress]   ---> Analytics Service (Record Review, Dashboard Stats, Due Reviews)
[AI Assistant]     ---> AI Service (Conversations, Chat Stream, Health Check)
```

Tài liệu này đóng vai trò là **Hướng dẫn Tích hợp API chuẩn** giúp lập trình viên Frontend triển khai kết nối chính xác 100% với các Microservices backend qua API Gateway mà không phát sinh xung đột dữ liệu.
