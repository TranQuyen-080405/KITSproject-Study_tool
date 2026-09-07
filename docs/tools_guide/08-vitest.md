# Vitest

## 1. Đây là gì?

Vitest là **framework chạy kiểm thử tự động** (unit/integration test). Bạn viết file test → Vitest chạy và báo pass/fail.

## 2. Vai trò trong dự án

Root và từng app đã khai báo script `"test": "vitest run --passWithNoTests"`. Cờ `--passWithNoTests` nghĩa là: hiện chưa có test cũng không fail — phù hợp giai đoạn skeleton.

## 3. Cách thức hoạt động

Vitest tìm file test (thường `*.test.ts` / trong `tests/`) → chạy các hàm `test` / `expect` → in kết quả.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm test
corepack pnpm --filter @korean-learning/content-service test
vitest run
vitest          # chế độ watch (khi dùng trực tiếp)
```

Cú pháp tối thiểu sau này:

```ts
import { expect, test } from "vitest";

test("1 + 1", () => {
  expect(1 + 1).toBe(2);
});
```

## 5. Ví dụ thực tế từ Source Code

Root [`package.json`](../../package.json):

```json
{
  "devDependencies": {
    "vitest": "^3.2.4"
  },
  "scripts": {
    "test": "corepack pnpm --recursive run test"
  }
}
```

Thư mục `tests/` đã có sẵn trong các service, nhưng chưa chứa file test nghiệp vụ.
