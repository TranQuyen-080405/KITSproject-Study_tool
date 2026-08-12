# User Service

FastAPI microservice quản lý tài khoản, đăng nhập và dữ liệu xác thực người dùng. Service sử dụng PostgreSQL riêng và không truy cập database của service khác.

Tài liệu request/response và giải thích các luồng: [API_CONTRACT.md](./API_CONTRACT.md).

## Chạy bằng Docker Compose

Từ thư mục gốc dự án:

```bash
docker compose up --build user-service-frontend
```

Compose tự khởi động frontend, `user-service` và `user-postgres`.

- Frontend demo: <http://localhost:8080>
- Swagger UI: <http://localhost:8001/docs>
- OpenAPI JSON: <http://localhost:8001/openapi.json>
- Health check: <http://localhost:8001/health>
- PostgreSQL: `localhost:5433`, database `user_service`, user/password `postgres`

## Luồng test nhanh

Frontend tại `http://localhost:8080` cung cấp một khung xác thực tối giản:

1. Đăng ký bằng username, tên hiển thị, email và mật khẩu.
2. Nhập OTP 6 chữ số nhận qua Gmail để xác minh.
3. Đăng nhập bằng username/password hoặc nút Google.
4. Quên mật khẩu và đặt lại bằng OTP gửi qua Gmail.
5. Đăng nhập thành công hiển thị màn hình chào `안녕하세요!`.

Google Login tự liên kết tài khoản nếu Google trả về email đã tồn tại và được xác minh. ID, username, password và role cũ được giữ nguyên; user có thể tiếp tục dùng cả hai cách đăng nhập.

Ví dụ đăng ký:

```bash
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"localadmin","email":"admin@example.com","password":"password123","displayName":"Local Admin"}'
```

## Cấu hình tối thiểu

Sao chép `.env.example` thành `.env`, sau đó cấu hình JWT, Gmail SMTP và Google OAuth. `GOOGLE_CLIENT_ID` được dùng đồng thời bởi backend để xác minh ID token và frontend để hiển thị nút Google.

Google OAuth Client phải có Authorized JavaScript origins:

```text
http://localhost:8080
http://127.0.0.1:8080
```

Sau khi thay `GOOGLE_CLIENT_ID`, phải build lại frontend:

```bash
docker compose up -d --build --force-recreate user-service-frontend
```

Để gửi mã thật qua Gmail, tạo Google App Password rồi cấu hình `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_FROM=your-account@gmail.com
SMTP_USERNAME=your-account@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_USE_TLS=true
```

Không commit App Password vào Git. Gmail chỉ là dịch vụ gửi thư; người dùng có thể đăng ký bằng bất kỳ địa chỉ email hợp lệ nào.

Service chỉ dùng bảng `users` với ID số tự tăng. Bảng được tạo khi service khởi động; khi schema bắt đầu thay đổi trong môi trường dùng chung, nên bổ sung Alembic migration thay cho `create_all`.
