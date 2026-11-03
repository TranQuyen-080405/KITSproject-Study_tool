# Capacitor Android

## Đây là gì?

Capacitor đóng một ứng dụng web vào Android WebView và cung cấp cầu nối tới API
native. Dự án dùng Capacitor để tránh duy trì hai bộ giao diện.

## Vai trò trong dự án

- `apps/web`: toàn bộ React UI, CSS và luồng học.
- `apps/web/dist`: đầu ra của Vite.
- `apps/mobile`: cấu hình Capacitor và Android project.
- Android chỉ gọi các service thông qua API Gateway.

## Luồng build

```text
apps/web source → vite build → apps/web/dist
                                  ↓
                            cap sync android
                                  ↓
                           Android WebView/APK
```

## Lệnh thường dùng

```powershell
corepack pnpm mobile:check
corepack pnpm mobile:backend
corepack pnpm mobile:sync
corepack pnpm mobile:android
corepack pnpm mobile:dev
```

Emulator dùng `10.0.2.2` để truy cập máy host. Debug cho phép HTTP local; release
phải dùng Gateway HTTPS. Xem hướng dẫn đầy đủ tại
[`apps/mobile/README.md`](../../apps/mobile/README.md).
