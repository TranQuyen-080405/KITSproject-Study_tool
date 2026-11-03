# Tổng quan kiến trúc

Ứng dụng là monorepo TypeScript. `apps/web` là React/Vite UI dùng chung:
trình duyệt chạy trực tiếp bản web, còn `apps/mobile` dùng Capacitor để đóng
chính bản build đó vào Android WebView. Cả hai client chỉ gọi API Gateway;
Gateway định tuyến request tới các backend service có thể triển khai độc lập.

```text
React/Vite Web ──build──> Capacitor Android
        \                  /
         \                /
          → API Gateway ←
                 ↓
User | Content | Learning | AI | Analytics Services
      ↓
PostgreSQL do từng service sở hữu

Sự kiện học tập → RabbitMQ → Analytics Service
```

Mỗi business service sở hữu API, logic nghiệp vụ, schema Prisma và database của riêng mình. Shared packages chỉ chứa hợp đồng dùng chung giữa các ranh giới hoặc tiện ích cấu hình.

Trên Android, API client dùng Gateway URL tuyệt đối, header
`X-Client-Platform: android` và refresh token lưu bằng Android Keystore. Trình
duyệt tiếp tục dùng `/api` cùng HttpOnly refresh cookie. UI và business flow
không được sao chép sang `apps/mobile`.
