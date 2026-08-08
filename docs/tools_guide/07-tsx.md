# tsx

## 1. Đây là gì?

`tsx` là công cụ **chạy file TypeScript ngay**, không cần bạn tự biên dịch sang JavaScript trước. `tsx watch` còn tự chạy lại khi bạn sửa file.

## 2. Vai trò trong dự án

Các backend service khai báo script phát triển:

```text
"dev": "tsx watch src/index.ts"
```

Nhờ đó, khi sau này implement logic, bạn chỉ cần `pnpm --filter ... dev` để service lắng nghe thay đổi.

## 3. Cách thức hoạt động

`tsx` đọc `src/index.ts` → hiểu TypeScript → chạy trên Node. Chế độ `watch` theo dõi file và restart process khi lưu.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
tsx src/index.ts
tsx watch src/index.ts
corepack pnpm --filter @korean-learning/user-service dev
```

## 5. Ví dụ thực tế từ Source Code

Trong [`apps/user-service/package.json`](../../apps/user-service/package.json):

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts"
  },
  "devDependencies": {
    "tsx": "^4.19.3"
  }
}
```

File entry hiện là placeholder [`apps/user-service/src/index.ts`](../../apps/user-service/src/index.ts) (chưa bootstrap HTTP server thật).
