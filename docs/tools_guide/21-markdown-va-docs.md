# Markdown & docs/

## 1. Đây là gì?

Markdown (`.md`) là cách viết tài liệu bằng text đơn giản: tiêu đề `#`, list `-`, khối code \`\`\`. Dễ đọc trên GitHub/Cursor mà không cần Word.

## 2. Vai trò trong dự án

- `README.md` — giới thiệu project, stack, roadmap  
- `docs/architecture/` — ranh giới service & luồng hệ thống  
- `docs/tools_guide/` — giải thích công cụ cho người mới  
- README ngắn trong từng app/service  

## 3. Cách thức hoạt động

Bạn viết `.md` → viewer render thành trang đẹp. Link tương đối (`./file.md`, `../../apps/...`) giúp nhảy giữa tài liệu và source.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

Không cần compile. Cú pháp cơ bản:

```md
# Tiêu đề
## Mục con
- list
`code nội dòng`
[link](./01-monorepo.md)
```

## 5. Ví dụ thực tế từ Source Code

[`docs/architecture/overview.md`](../architecture/overview.md) mô tả luồng:

```text
Web / Mobile → API Gateway → Services → DB riêng
Learning events → RabbitMQ → Analytics
```

Root [`README.md`](../../README.md) có overview + 8 phase triển khai.
