# React Native & Expo

## 1. Đây là gì?

React Native = viết UI mobile (iOS/Android) bằng React.  
Expo = bộ công cụ giúp chạy/thử app React Native dễ hơn (không cần setup native nặng ngay từ đầu).

## 2. Vai trò trong dự án

`apps/mobile` là client di động của app học từ vựng. Cùng TypeScript/React mental model với web, nhưng component khác (`View`, `Text` thay vì `div`).

## 3. Cách thức hoạt động

Bạn chạy Expo → quét QR / mở simulator → app load JS bundle. Sau này mobile cũng gọi API Gateway giống web.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm --filter @korean-learning/mobile start
# tương đương script:
expo start
```

## 5. Ví dụ thực tế từ Source Code

[`apps/mobile/package.json`](../../apps/mobile/package.json):

```json
{
  "name": "@korean-learning/mobile",
  "scripts": {
    "start": "expo start"
  },
  "dependencies": {
    "expo": "^53.0.0",
    "react": "^19.0.0",
    "react-native": "^0.79.0"
  }
}
```

[`apps/mobile/src/app.tsx`](../../apps/mobile/src/app.tsx):

```tsx
// This file will render the Expo React Native client.
export default function App(): null {
  return null;
}
```
