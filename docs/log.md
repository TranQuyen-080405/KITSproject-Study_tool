# Nhật ký thay đổi lớn

Đọc từ trên xuống. Mỗi lần sửa lớn: **thêm khối mới ở cuối** (không xóa mục cũ).

- Tên người code lấy từ `developer.config.json` → trường `coderName`
- Nếu chưa có tên: điền `coderName` trong `developer.config.json`

Ghi log (tự gắn tên + thời gian):

```bash
corepack pnpm log "<mô tả phần thêm / sửa>" "<chức năng đó làm gì>"
```

Format mỗi mục (do script tạo):

```text
--- {coderName} <YYYY-MM-DD HH:mm>------
- mô tả phần thêm / sửa
- chức năng đó làm gì
----------------------------------------
```

--- Trần Quyền <2026-08-08 13:28>------
- Khởi tạo monorepo từ repo trống: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`, `.env.example`, `docker-compose.yml`, `infrastructure/docker/`, `infrastructure/rabbitmq/`, `infrastructure/postgres/`.
- Tạo `apps/web`, `apps/mobile`, `apps/api-gateway`, `apps/user-service`, `apps/content-service`, `apps/learning-service`, `apps/ai-service`, `apps/analytics-service` — mỗi backend service có `src/` (routes/controllers/services/repositories/config/events), `prisma/schema.prisma` riêng (trừ gateway), `tests/`, `package.json`, `tsconfig.json`, README ngắn.
- Tạo `packages/shared-types`, `packages/shared-validation`, `packages/config` (placeholder, không business logic).
- Thêm `README.md` + `docs/architecture/overview.md` + `service-boundaries.md` mô tả luồng Gateway → services → DB riêng và Learning → RabbitMQ → Analytics.
- Mục đích: skeleton microservices để team bắt đầu code theo database-per-service, chưa implement nghiệp vụ.
----------------------------------------

--- Trần Quyền <2026-08-08 13:38>------
- Sửa `.cursor/rules/lazycode.mdc`: gộp frontmatter trùng, bỏ `globs` trống, giữ `alwaysApply: true`.
- Mục đích: rule “lazy senior / YAGNI” load ổn định trong Cursor.
----------------------------------------

--- Trần Quyền <2026-08-08 13:48>------
- Tạo `docs/tools_guide/` gồm 24 file hướng dẫn người mới (từ monorepo, pnpm, TypeScript, Express, Prisma, Docker, React, Expo… đến shared packages).
- Đánh số `00`–`23` và cập nhật link trong `00-readme-muc-luc.md`.
- Mục đích: đọc structure/tooling không bị lạc khi chưa biết stack.
----------------------------------------

--- Trần Quyền <2026-08-08 14:18>------
- Thêm 7 rule kỹ thuật trong `.cursor/rules/`: `architecture.mdc`, `microservices.mdc`, `backend-typescript.mdc`, `database.mdc`, `api-testing.mdc`, `security.mdc`, `docker-devops.mdc`.
- Mục đích: ràng buộc agent/team theo boundary, layer routes→controllers→services→repositories, DB per service, REST vs RabbitMQ, security/Compose tối thiểu — tránh biến project thành monolith hoặc abstraction thừa.
----------------------------------------

--- Trần Quyền <2026-08-08 14:32>------
- Bổ sung web chạy thử lần đầu: `apps/web/index.html`, `src/main.tsx`, `vite.config.ts`, dependency Vite + `@vitejs/plugin-react`; `app.tsx` hiển thị chữ demo.
- Cài package web và chạy `corepack pnpm --filter @korean-learning/web dev` (http://localhost:5173/).
- Mục đích: có entry-point Vite/React thật để mở trình duyệt kiểm tra skeleton UI.
----------------------------------------

--- Trần Quyền <2026-08-08 14:47>------
- Thêm `.cursor/rules/ui-ux.mdc` cho `apps/web` và `apps/mobile`: hierarchy, states (loading/empty/error), a11y, UX học flashcard/SRS, tránh look AI mặc định, client chỉ gọi Gateway; không ép Tailwind nếu chưa có trong stack.
- Mục đích: chuẩn UI/UX khi agent/team làm frontend.
----------------------------------------

--- Trần Quyền <2026-08-08 14:56>------
- Thêm rule `.cursor/rules/service-ownership.mdc`: bảng ownership từng client/service, layer trong service, checklist trước khi sửa code, thứ tự build gợi ý — để AI và team không đặt feature nhầm chỗ (UI vs service, Gateway, không đụng DB service khác).
- Thêm rule `.cursor/rules/change-log.mdc` + file `developer.config.json` (trường `coderName`) + khởi tạo `docs/log.md`: mỗi lần sửa lớn phải ghi nhật ký theo format cố định, tên lấy từ config, nối tiếp ở cuối file.
- Dọn file mẫu `developer.config.example.json` và gỡ mọi chỗ nhắc tới nó trong rule/`docs/log.md` — chỉ còn một nguồn tên: `developer.config.json`.
----------------------------------------

--- Trần Quyền <2026-08-08 14:59>------
- Backfill `docs/log.md` từ đầu dự án (repo trống → skeleton → docs tools/architecture → Cursor rules → web Vite demo → README/UI rules → ownership/changelog) thành chuỗi mục theo thời gian.
- Mục đích: có nhật ký gốc để team theo dõi lịch sử thao tác lớn trước khi tiếp tục phase feature.
----------------------------------------

--- Trần Quyền <2026-08-08 15:03>------
- Thêm scripts/append-change-log.mjs + script root pnpm log; cập nhật change-log.mdc và hướng dẫn trong docs/log.md.
- Gọi appendChangeLog(mô tả, chức năng) hoặc corepack pnpm log để tự ghi coderName + thời gian local vào cuối docs/log.md, không cần Get-Date thủ công.
----------------------------------------

--- Trần Quyền <2026-08-08 22:20>------
- Thêm docs/team-roadmap-7-people.md: phân 7 workstream ownership, deliverable, handoff, Definition of Done và roadmap 12 tuần Web MVP → AI/event analytics → mobile/hardening.
- Team có lộ trình end-to-end để làm song song mà vẫn theo Gateway, database-per-service và Learning event → Analytics read model.
----------------------------------------
