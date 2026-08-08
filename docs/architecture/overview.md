# Tổng quan kiến trúc

Ứng dụng là monorepo TypeScript: client web (React) và mobile (Expo) gọi vào một API Gateway. Gateway sẽ định tuyến request tới các backend service có thể triển khai độc lập.

```text
Web / Mobile
      ↓
API Gateway
      ↓
User | Content | Learning | AI | Analytics Services
      ↓
PostgreSQL do từng service sở hữu

Sự kiện học tập → RabbitMQ → Analytics Service
```

Mỗi business service sở hữu API, logic nghiệp vụ, schema Prisma và database của riêng mình. Shared packages chỉ chứa hợp đồng dùng chung giữa các ranh giới hoặc tiện ích cấu hình.
