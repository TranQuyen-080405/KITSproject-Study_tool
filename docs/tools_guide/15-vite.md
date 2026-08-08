# Vite

## 1. Đây là gì?

Vite là **công cụ phát triển frontend**: bật server local, làm mới trang nhanh khi bạn sửa code (hot reload). Giống “máy chạy thử” cho app React.

## 2. Vai trò trong dự án

`apps/web` đã khai báo script `"dev": "vite"`. Skeleton chưa có `vite.config` đầy đủ hay `index.html` — nhưng Vite đã nằm trong kế hoạch stack web, nên cần hiểu khi đọc `package.json`.

## 3. Cách thức hoạt động

Vite phục vụ file nguồn trong lúc dev → trình duyệt tải module → khi build production, Vite đóng gói asset tối ưu. Thường kết hợp plugin React.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
vite
vite build
vite preview
corepack pnpm --filter @korean-learning/web dev
```

## 5. Ví dụ thực tế từ Source Code

[`apps/web/package.json`](../../apps/web/package.json):

```json
{
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit"
  }
}
```

Lưu ý: chạy `dev` sẽ cần bổ sung cấu hình Vite trước khi dùng được thật sự.
