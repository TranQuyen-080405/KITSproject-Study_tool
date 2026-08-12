# User Service API Contract

Tài liệu này mô tả đúng API đang được cài đặt trong `apps/user-service`. Phần đầu dùng để tra cứu nhanh; phần sau giải thích cách các luồng hoạt động bên trong.

## 1. Thông tin chung

- Base URL local: `http://localhost:8001/api/v1`
- Swagger UI: `http://localhost:8001/docs`
- React demo: `http://localhost:8080`
- Health check: `http://localhost:8001/health`
- Request/response: JSON
- Access token: JWT trong header `Authorization: Bearer <accessToken>`
- Refresh token: cookie `HttpOnly` tên `refresh_token`
- ID người dùng: số nguyên tự tăng `1, 2, 3...`

Response lỗi có cấu trúc chung:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Thông báo dễ hiểu"
  }
}
```

## 2. API Contract tra cứu nhanh

### 2.1. Kiểm tra service

```http
GET /health
```

Response `200`:

```json
{
  "status": "ok",
  "service": "user-service"
}
```

### 2.2. Đăng ký

```http
POST /api/v1/auth/register
```

Request:

```json
{
  "username": "thaison",
  "email": "thaison@gmail.com",
  "password": "password123",
  "displayName": "Thai Son"
}
```

Quy tắc:

- `username`: 3–50 ký tự, chỉ gồm chữ, số, `_`, `.`, `-`.
- `email`: đúng định dạng và chưa được đăng ký.
- `password`: 8–128 ký tự.
- `displayName`: 1–100 ký tự.

Response `201`:

```json
{
  "user": {
    "id": 1,
    "username": "thaison",
    "email": "thaison@gmail.com",
    "displayName": "Thai Son",
    "emailVerified": false
  }
}
```

Lỗi thường gặp: `EMAIL_ALREADY_EXISTS`, `USERNAME_ALREADY_EXISTS`, `VALIDATION_ERROR`.

### 2.3. Xác minh email

```http
POST /api/v1/auth/verify-email
```

Request:

```json
{
  "email": "thaison@gmail.com",
  "code": "123456"
}
```

Response `200`:

```json
{
  "message": "Xác minh email thành công",
  "user": {
    "id": 1,
    "username": "thaison",
    "email": "thaison@gmail.com",
    "displayName": "Thai Son",
    "emailVerified": true
  }
}
```

Lỗi thường gặp: `EMAIL_NOT_FOUND`, `INVALID_CODE`.

### 2.4. Đăng nhập bằng username/password

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "username": "thaison",
  "password": "password123"
}
```

Response `200`:

```json
{
  "accessToken": "eyJ...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "username": "thaison",
    "email": "thaison@gmail.com",
    "displayName": "Thai Son",
    "emailVerified": true
  }
}
```

Response đồng thời đặt refresh token trong cookie `HttpOnly`. Lỗi thường gặp: `INVALID_CREDENTIALS`, `EMAIL_NOT_VERIFIED`, `ACCOUNT_DISABLED`.

### 2.5. Đăng nhập Google

```http
POST /api/v1/auth/google
```

Request:

```json
{
  "idToken": "google-id-token-from-frontend"
}
```

Response `200` giống API login thông thường. Nếu email Google đã tồn tại trong hệ thống, backend tự liên kết Google identity vào tài khoản đó và đăng nhập; password cũ vẫn sử dụng được. Lỗi thường gặp: `GOOGLE_AUTH_NOT_CONFIGURED`, `INVALID_TOKEN`, `GOOGLE_ACCOUNT_CONFLICT`.

### 2.6. Làm mới access token

```http
POST /api/v1/auth/refresh
```

Với trình duyệt, không cần body vì refresh token được đọc từ cookie:

```json
{}
```

Client không dùng cookie có thể gửi:

```json
{
  "refreshToken": "raw-refresh-token"
}
```

Response `200` giống login và đặt refresh cookie mới. Refresh token cũ mất hiệu lực.

### 2.7. Đăng xuất

```http
POST /api/v1/auth/logout
```

Body có thể để trống hoặc gửi `refreshToken` như API refresh. Response `204` không có body. Service xóa refresh token trong database và cookie trình duyệt.

### 2.8. Quên mật khẩu

```http
POST /api/v1/auth/forgot-password
```

Request:

```json
{
  "email": "thaison@gmail.com"
}
```

Response `202`:

```json
{
  "message": "Hướng dẫn đặt lại mật khẩu đã được gửi"
}
```

Nếu email không có trong database, API trả `404 EMAIL_NOT_FOUND`. Nếu tồn tại, hệ thống gửi mã 6 chữ số tới email đó.

### 2.9. Đặt lại mật khẩu

```http
POST /api/v1/auth/reset-password
```

Request:

```json
{
  "email": "thaison@gmail.com",
  "code": "123456",
  "newPassword": "new-password123"
}
```

Response `200`:

```json
{
  "message": "Đổi mật khẩu thành công, vui lòng đăng nhập lại"
}
```

Sau khi đổi mật khẩu, refresh token hiện tại bị hủy và người dùng phải đăng nhập lại.

### 2.10. Lấy thông tin tài khoản đang đăng nhập

```http
GET /api/v1/users/me
Authorization: Bearer <accessToken>
```

Response `200`:

```json
{
  "id": 1,
  "username": "thaison",
  "email": "thaison@gmail.com",
  "displayName": "Thai Son",
  "emailVerified": true
}
```

### 2.11. Admin lấy user theo ID

```http
GET /api/v1/users/3
Authorization: Bearer <adminAccessToken>
```

Response `200`:

```json
{
  "id": 3,
  "username": "user3",
  "email": "user3@gmail.com",
  "displayName": "User 3",
  "emailVerified": true,
  "status": "ACTIVE",
  "role": "USER",
  "createdAt": "2026-08-12T08:00:00+00:00"
}
```

Chỉ role `ADMIN` được gọi. Lỗi: `INVALID_TOKEN`, `FORBIDDEN`, `USER_NOT_FOUND`.

### 2.12. Admin xóa user theo ID

```http
DELETE /api/v1/users/3
Authorization: Bearer <adminAccessToken>
```

Response `200`:

```json
{
  "message": "Xóa người dùng thành công",
  "userId": 3
}
```

Đây là hard delete: bản ghi bị xóa hoàn toàn khỏi PostgreSQL và không thể khôi phục nếu không có backup.

## 3. Cách sử dụng access token trong Swagger

1. Gọi API login.
2. Sao chép giá trị `accessToken` trong response.
3. Nhấn **Authorize** ở góc trên Swagger.
4. Dán chuỗi token `eyJ...`, không thêm dấu ngoặc kép.
5. Gọi `/users/me` hoặc API admin.

Access token tồn tại 15 phút. Role được ghi vào token khi đăng nhập; nếu role trong database vừa thay đổi, phải đăng nhập lại để nhận token mới.

### 3.1. Frontend React demo

Frontend tại `http://localhost:8080` tập trung vào các luồng xác thực:

- Khung đăng nhập username/password ở giữa trang.
- Nút **Tiếp tục với Google** bằng Google Identity Services.
- Đăng ký và tự chuyển sang bước nhập OTP.
- Quên mật khẩu và tự chuyển sang bước đặt mật khẩu mới.
- Lưu access token và thông tin user trong local storage để phục vụ demo.
- Refresh token do backend quản lý bằng cookie `HttpOnly`.
- Sau đăng nhập hiển thị `안녕하세요!` và nút đăng xuất.

Frontend này phục vụ demo nhanh; ứng dụng production nên cân nhắc giữ access token trong memory thay vì local storage để giảm rủi ro XSS.

## 4. Giải thích các luồng đã cài đặt

### 4.1. Luồng đăng ký và xác minh email

1. API chuẩn hóa `username` và `email` về chữ thường.
2. Kiểm tra username/email chưa tồn tại.
3. Mật khẩu được băm bằng Argon2; database không lưu mật khẩu gốc.
4. Service sinh mã OTP ngẫu nhiên gồm 6 chữ số.
5. Database chỉ lưu SHA-256 hash của mã cùng thời gian hết hạn 60 phút.
6. User được tạo với trạng thái `PENDING_VERIFICATION`.
7. FastAPI Background Task gửi mã qua SMTP.
8. Khi người dùng gửi đúng email và mã, service xóa hash mã, đặt `email_verified_at` và chuyển trạng thái sang `ACTIVE`.

Nếu SMTP gửi thất bại sau khi API register đã trả response, user vẫn được tạo nhưng chưa nhận được mã; lỗi gửi thư xuất hiện trong log container.

### 4.2. Luồng đăng nhập và JWT

1. Tìm user theo username.
2. So sánh password với Argon2 hash.
3. Chỉ user `ACTIVE` và đã xác minh email được đăng nhập.
4. Service tạo JWT access token có các claim: `sub`, `role`, `iat`, `exp`, `iss`, `aud`.
5. Service tạo refresh token ngẫu nhiên; chỉ SHA-256 hash được lưu trong bảng `users`.
6. Raw refresh token được đặt vào cookie `HttpOnly`.

Schema tối giản chỉ giữ một refresh token cho mỗi user. Vì vậy đăng nhập ở thiết bị mới làm refresh token của thiết bị trước mất hiệu lực.

### 4.3. Luồng refresh và logout

Refresh:

1. Đọc refresh token từ cookie hoặc request body.
2. Băm token và tìm user có hash tương ứng.
3. Kiểm tra hạn token và trạng thái user.
4. Tạo access token và refresh token mới; hash cũ bị ghi đè.

Logout:

1. Tìm user bằng hash refresh token.
2. Xóa refresh-token hash và thời hạn khỏi user.
3. Xóa cookie trên trình duyệt.

### 4.4. Luồng quên mật khẩu

1. Người dùng nhập email đã đăng ký.
2. Nếu email không tồn tại, trả `404 EMAIL_NOT_FOUND`.
3. Nếu tồn tại, sinh mã 6 chữ số có hạn 30 phút.
4. Chỉ lưu hash mã trong database và gửi raw code qua email.
5. Khi reset, kiểm tra email, hash code và thời hạn.
6. Băm mật khẩu mới, xóa mã reset và hủy refresh token hiện tại.

### 4.5. Luồng quyền ADMIN

Email nằm trong `USER_ADMIN_EMAILS` được gán role `ADMIN` tại thời điểm đăng ký. Thay đổi `.env` không tự cập nhật role của user đã tồn tại.

Hai API quản trị kiểm tra cả access token hợp lệ và role `ADMIN`:

- `GET /users/{id}`
- `DELETE /users/{id}`

API delete xóa vật lý user khỏi database.

## 5. Google Login hoạt động như thế nào

Google Login và Gmail SMTP là hai chức năng độc lập:

- Google Login dùng `GOOGLE_CLIENT_ID` và Google ID token để xác thực danh tính.
- Gmail SMTP dùng Gmail + App Password để gửi mã OTP.

Luồng Google Login hiện tại:

1. Frontend hiển thị nút **Sign in with Google** bằng Google Identity Services.
2. Người dùng đăng nhập Google trên frontend.
3. Google trả về một ID token cho frontend.
4. Frontend gửi ID token tới `POST /api/v1/auth/google`.
5. Backend dùng thư viện `google-auth` kiểm tra token với Google, gồm chữ ký, audience, issuer và thời hạn.
6. Backend yêu cầu Google trả `email_verified = true`.
7. Nếu `google_subject` đã tồn tại, đăng nhập user tương ứng.
8. Nếu subject chưa tồn tại nhưng email đã có tài khoản, tự liên kết subject Google vào user đó. Vì Google đã xác nhận `email_verified`, tài khoản chờ xác minh cũng được kích hoạt.
9. Nếu cả subject và email chưa tồn tại, tạo user `ACTIVE` mới.
10. Backend phát hành access token và refresh token của KITS; các API sau đó không dùng Google token.

Sau khi liên kết, user có thể đăng nhập bằng Google hoặc username/password cũ. Nếu email đã gắn với một Google subject khác, backend trả `409 GOOGLE_ACCOUNT_CONFLICT` để tránh ghi đè danh tính.

### Setup Google Login

1. Mở Google Cloud Console.
2. Tạo hoặc chọn một project.
3. Cấu hình OAuth consent screen.
4. Tạo OAuth Client ID loại **Web application**.
5. Thêm chính xác các frontend origin local vào Authorized JavaScript origins:

```text
http://localhost:8080
http://127.0.0.1:8080
```

Nếu OAuth app đang ở chế độ Testing và Audience là External, thêm email cần demo vào danh sách Test users.

6. Sao chép Client ID vào `.env`:

```env
GOOGLE_CLIENT_ID=123456789-example.apps.googleusercontent.com
```

7. Docker Compose truyền cùng Client ID vào backend và frontend build qua `VITE_GOOGLE_CLIENT_ID`.
8. Rebuild frontend và recreate toàn bộ chuỗi dependency để nhận cấu hình mới:

```bash
docker compose up -d --build --force-recreate user-service-frontend
```

## 6. Setup gửi email thật qua Gmail

Một tài khoản Gmail chung đóng vai trò người gửi; người đăng ký có thể nhập bất kỳ email hợp lệ nào để nhận mã.

1. Tạo/chọn Gmail dùng để gửi thư, ví dụ `kits.noreply@gmail.com`.
2. Bật xác minh hai bước cho tài khoản Google đó.
3. Mở `https://myaccount.google.com/apppasswords`.
4. Tạo App Password, ví dụ tên `KITS User Service`.
5. Điền `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=kits.noreply@gmail.com
SMTP_USERNAME=kits.noreply@gmail.com
SMTP_PASSWORD=google-app-password-16-ky-tu
SMTP_USE_TLS=true
```

6. Không commit `.env` và không dùng mật khẩu Gmail thông thường.
7. Recreate user-service.

## 7. Setup và chạy bằng Docker

Yêu cầu: Docker Engine/Docker Desktop và Docker Compose.

Từ thư mục gốc dự án:

```bash
docker compose up -d --build user-service-frontend
```

Lệnh trên tự chạy:

- `user-service-frontend`: React build được Nginx phục vụ tại cổng `8080`.
- `user-service`: FastAPI tại cổng `8001`.
- `user-postgres`: PostgreSQL tại cổng `5433`.

Kiểm tra:

```bash
docker compose ps user-service user-service-frontend user-postgres
docker compose logs -f user-service
```

Kết nối PostgreSQL bằng pgAdmin/DBeaver:

```text
Host: 127.0.0.1
Port: 5433
Maintenance database: postgres
Database: user_service
Username: postgres
Password: postgres
```

Database hiện chỉ có bảng `users`. Các password, OTP và refresh token đều được lưu dưới dạng hash.

## 8. Biến môi trường quan trọng

| Biến | Ý nghĩa |
| --- | --- |
| `USER_JWT_SECRET` | Khóa ký JWT; phải là chuỗi bí mật mạnh |
| `USER_ADMIN_EMAILS` | Danh sách email admin, phân cách bằng dấu phẩy |
| `GOOGLE_CLIENT_ID` | OAuth Client ID cho Google Login |
| `USER_API_URL` | Base URL FastAPI được nhúng vào frontend lúc build |
| `FRONTEND_URL` | Origin frontend được backend cho phép qua CORS |
| `SMTP_HOST`, `SMTP_PORT` | Server và cổng gửi email |
| `SMTP_FROM` | Địa chỉ hiển thị người gửi |
| `SMTP_USERNAME` | Tài khoản đăng nhập SMTP |
| `SMTP_PASSWORD` | Google App Password hoặc SMTP credential |
| `SMTP_USE_TLS` | Bật STARTTLS khi dùng Gmail cổng 587 |

File `.env` chứa secret và đã được `.gitignore`; không đưa file này lên Git. Chỉ commit `.env.example` với giá trị mẫu.

## 9. Phạm vi và thiết kế dữ liệu

`user-service` chỉ chịu trách nhiệm về tài khoản và xác thực người dùng:

- Đăng ký, xác minh email và đăng nhập.
- Google Login.
- Access token, refresh token và đăng xuất.
- Quên/đặt lại mật khẩu.
- Đọc và xóa người dùng theo quyền admin.

Nội dung học thuộc `content-service`; tiến độ học thuộc `learning-service`; AI và analytics thuộc các service tương ứng.

### Bảng `users`

MVP cố ý dùng một bảng duy nhất. ID là số nguyên tự tăng. Mỗi user chỉ có một refresh session và một Google identity tại một thời điểm.

| Nhóm | Cột chính | Mục đích |
| --- | --- | --- |
| Danh tính | `id`, `username`, `email`, `display_name` | Thông tin tài khoản |
| Mật khẩu | `password_hash` | Argon2 hash; NULL với tài khoản chỉ dùng Google |
| Google | `google_subject` | Claim Google `sub`, duy nhất |
| Xác minh | `verification_code_hash`, `verification_code_expires_at` | OTP xác minh hiện tại |
| Khôi phục | `reset_code_hash`, `reset_code_expires_at` | OTP đặt lại mật khẩu hiện tại |
| Phiên | `refresh_token_hash`, `refresh_token_expires_at` | Refresh token hiện tại |
| Trạng thái | `email_verified_at`, `status`, `role` | Trạng thái và quyền tài khoản |
| Thời gian | `created_at`, `updated_at`, `deleted_at` | Metadata thời gian |

Không trả các cột hash hoặc dữ liệu nội bộ nhạy cảm qua API.

## 10. Mã lỗi và yêu cầu bảo mật

| HTTP | Code | Ý nghĩa |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Request không đúng định dạng |
| `401` | `INVALID_CREDENTIALS` | Sai username hoặc mật khẩu |
| `401` | `INVALID_TOKEN` | Access/refresh/Google token không hợp lệ |
| `401` | `INVALID_CODE` | OTP sai hoặc hết hạn |
| `403` | `EMAIL_NOT_VERIFIED` | Email chưa được xác minh |
| `403` | `ACCOUNT_DISABLED` | Tài khoản không hoạt động |
| `403` | `FORBIDDEN` | Không có quyền admin |
| `404` | `EMAIL_NOT_FOUND` | Email không tồn tại |
| `404` | `USER_NOT_FOUND` | User ID không tồn tại |
| `409` | `EMAIL_ALREADY_EXISTS` | Email đã được đăng ký |
| `409` | `USERNAME_ALREADY_EXISTS` | Username đã tồn tại |
| `409` | `GOOGLE_ACCOUNT_CONFLICT` | Email đã liên kết với Google account khác |
| `503` | `GOOGLE_AUTH_NOT_CONFIGURED` | Chưa cấu hình Google Client ID |

Yêu cầu bảo mật tối thiểu:

- Chỉ dùng HTTPS ngoài môi trường local và bật secure cookie khi deploy.
- Không log password, raw OTP, raw refresh token, Google ID token hoặc SMTP credential.
- Không commit `.env`; secret production phải nằm trong secret manager hoặc biến môi trường bảo mật.
- Rate limit các endpoint đăng ký, đăng nhập, xác minh và khôi phục mật khẩu trước khi public service.
- Service nhận JWT phải kiểm tra signature, issuer, audience và thời hạn.
- Hard delete user là thao tác không thể hoàn tác nếu không có backup.
