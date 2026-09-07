# RabbitMQ

## 1. Đây là gì?

RabbitMQ là **hàng đợi tin nhắn**: service A gửi sự kiện (“user vừa học xong 10 thẻ”) vào hàng đợi; service B nhận và xử lý sau, không cần gọi API trực tiếp lẫn nhau.

## 2. Vai trò trong dự án

Analytics Service sẽ **consume** domain events (khi có) để cập nhật dashboard — đúng nguyên tắc: Analytics không đọc database của service khác.

Hiện mới có placeholder:

- service `rabbitmq` trong Docker Compose  
- thư mục `infrastructure/rabbitmq/`  
- folder `src/events/` trong từng service  
- biến `RABBITMQ_URL` trong `.env.example`  

**Chưa implement** producer/consumer.

## 3. Cách thức hoạt động (dự kiến)

```text
Learning Service --(event)--> RabbitMQ --(event)--> Analytics Service
```

REST vẫn dùng cho request đồng bộ (đăng nhập, lấy flashcard). Event dùng cho việc “xảy ra rồi, báo cho bên khác biết”.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
docker compose up rabbitmq -d
# UI quản trị mặc định (khi image management): http://localhost:15672
# guest / guest (chỉ local)
```

URL kết nối mẫu: `amqp://guest:guest@localhost:5672`

## 5. Ví dụ thực tế từ Source Code

[`.env.example`](../../.env.example):

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

[`infrastructure/rabbitmq/README.md`](../../infrastructure/rabbitmq/README.md) ghi rõ: producers/consumers cố ý chưa viết.
