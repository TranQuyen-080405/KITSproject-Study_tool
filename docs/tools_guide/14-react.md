# React

## 1. Đây là gì?

React là thư viện xây **giao diện web** bằng các “component” (mảnh UI tái sử dụng). File thường là `.tsx` vì kết hợp TypeScript + JSX (HTML-trong-JS).

## 2. Vai trò trong dự án

App web nằm ở `apps/web`, phụ thuộc `react` và `react-dom`. Đây sẽ là client người học mở trên trình duyệt: học flashcard, xem dashboard… Hiện mới có shell placeholder.

## 3. Cách thức hoạt động

Component mô tả UI → React cập nhật DOM khi state đổi → gọi API qua API Gateway (sau này). Dev server dự kiến dùng Vite (`"dev": "vite"`).

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm --filter @korean-learning/web typecheck
# Sau khi cấu hình Vite đầy đủ:
corepack pnpm --filter @korean-learning/web dev
```

Cú pháp JSX tối thiểu:

```tsx
export function Hello() {
  return <h1>안녕하세요</h1>;
}
```

## 5. Ví dụ thực tế từ Source Code

[`apps/web/package.json`](../../apps/web/package.json):

```json
{
  "name": "@korean-learning/web",
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  }
}
```

[`apps/web/src/app.tsx`](../../apps/web/src/app.tsx) hiện chỉ là placeholder:

```tsx
// This file will render the React web client.
export {};
```
