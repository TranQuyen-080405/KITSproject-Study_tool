# Shared packages (`packages/`)

## 1. Đây là gì?

Shared packages = vài package **dùng chung thật sự cần thiết** giữa web, mobile, gateway và services. Không phải chỗ nhét toàn bộ business logic.

## 2. Vai trò trong dự án

Project cố ý chỉ có 3 package:

| Package | Việc |
| --- | --- |
| `shared-types` | Type dùng chung (User, Flashcard…) — sau này |
| `shared-validation` | Schema validate chung (Zod) — sau này |
| `config` | Utility cấu hình thật sự dùng chung |

**Không có** `shared-database` / `shared-business-logic` — mỗi service tự sở hữu logic & DB.

## 3. Cách thức hoạt động

Package export từ `src/index.ts`. App khác sẽ import qua tên `@korean-learning/...` khi cần. Hiện các entry chỉ là placeholder `export {}` + TODO.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm --filter @korean-learning/shared-types typecheck
corepack pnpm --filter @korean-learning/shared-validation typecheck
corepack pnpm --filter @korean-learning/config typecheck
```

Import sau này (khi có export thật):

```ts
import type { Flashcard } from "@korean-learning/shared-types";
```

## 5. Ví dụ thực tế từ Source Code

[`packages/shared-types/src/index.ts`](../../packages/shared-types/src/index.ts):

```ts
// This package will expose only cross-boundary TypeScript types.
// TODO: Add types only when they are required by more than one boundary.
export {};
```

Cấu trúc:

```text
packages/
├── shared-types/
├── shared-validation/
└── config/
```
