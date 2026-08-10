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

--- Trần Quyền <2026-08-09 22:45>------
- Thêm mục Setup môi trường vào đầu README: bảng phải khớp/có thể khác, lệnh kiểm tra, bước máy mới, lệnh chạy web.
- Giúp teammate máy khác đồng bộ toolchain (Node/pnpm/Docker/env) trước khi code.
----------------------------------------

--- Trần Quyền <2026-08-09 23:03>------
- Thêm UI lesson page trong apps/web: AppSidebar dùng chung, LessonPage với 6 thanh bài học, CSS responsive và Vite type declaration cho CSS import.
- Cung cấp màn hình UI tĩnh đầu tiên để xem danh sách bài học; chưa có điều hướng, MCQ hoặc API/database.
----------------------------------------

--- Trần Quyền <2026-08-09 23:32>------
- Thêm Chatbot UI trong apps/web: chatbot-page với vùng tin nhắn, ô nhập/gửi local state; refactor AppSidebar/App để chuyển giữa Bài học và Chatbot; bổ sung CSS responsive.
- Người dùng có thể mở Chatbot từ sidebar, gõ và gửi tin nhắn để xem giao diện; chưa kết nối AI Service hoặc API.
----------------------------------------

--- Trần Quyền <2026-08-09 23:36>------
- Thêm MCQ UI trong apps/web: bấm bài học mở mcq-page có câu hỏi, 4 đáp án chọn được, nút quay lại và CTA câu tiếp theo; App state quản lý selected lesson.
- Tạo flow UI Bài học → MCQ để xem giao diện làm bài, chưa chấm điểm, chuyển câu hay lưu kết quả/database.
----------------------------------------

--- Trần Quyền <2026-08-09 23:56>------
- Di chuyển mock lesson/question/answer data khỏi Web sang apps/content-service/src/mocks/mock-lesson-database.ts; đổi sang các type/biến rõ ownership như MockLessonDatabase, lessonRecords, lessonQuestions và answerOptions.
- Mock content nằm đúng Content Service để sau này thay bằng Prisma repository và Gateway API; Web không còn sở hữu hoặc import trực tiếp dữ liệu bài học.
----------------------------------------

--- Trần Quyền <2026-08-10 00:03>------
- Implement MCQ lesson vertical slice: Content Service đọc mock-lesson-database qua repository/service/controller/routes; API Gateway proxy GET /api/lessons và /api/lessons/:id với timeout; Web gọi Gateway qua Vite proxy, LessonPage/McqPage load dữ liệu thật từ mock.
- Khi bấm bài học, Web lấy câu hỏi MCQ qua Gateway → Content Service thay vì dữ liệu cứng; chưa chấm điểm/đáp án đúng và chưa dùng Postgres.
----------------------------------------

--- Trần Quyền <2026-08-10 00:06>------
- Thêm script root dev:mcq và scripts/dev-mcq.cmd + .ps1 để chạy Content Service, API Gateway, Web song song; cập nhật README hướng dẫn chạy MCQ một lệnh.
- Team không cần mở 3 terminal thủ công khi phát triển flow bài học/MCQ qua Gateway.
----------------------------------------

--- Trần Quyền <2026-08-10 00:28>------
- Thêm apps/user-service/src/mocks/mock-user-database.ts với demo-user (email, displayName, userId) và scrypt password hash cho mật khẩu local 1234.
- Chuẩn bị dữ liệu User Service cho luồng login/token sau này; không lưu mật khẩu plaintext và chưa cho service khác truy cập User DB.
----------------------------------------

--- Trần Quyền <2026-08-10 00:34>------
- Mở rộng run:all chạy Learning/Analytics; thêm Learning chấm bài qua Content, phát RabbitMQ AnswerChecked; Analytics lưu correctCount/wrongCount idempotent; Gateway dashboard route và Web Dashboard biểu đồ cột.
- Demo-user có thể tạo số liệu đúng/sai theo từ qua luồng service; RabbitMQ phải chạy để Analytics nhận event, UI score submission còn cần nối hoàn chỉnh.
----------------------------------------

--- Trần Quyền <2026-08-10 00:37>------
- Đơn giản hóa Learning → Analytics: giữ publishAnswerCheckedEvents nhưng thay RabbitMQ/amqplib bằng HTTP nội bộ tới Analytics; Analytics idempotent xử lý POST internal event, bỏ consumer broker.
- run:all không còn cần RabbitMQ để chạy MVP; đây là shortcut HTTP tạm thời, có ponytail comment để sau thay lại RabbitMQ khi cần durability/retry.
----------------------------------------

--- Trần Quyền <2026-08-10 01:19>------
- Thêm đăng nhập mock qua User Service, hiển thị tài khoản và lưu Analytics theo từng user.
- Người dùng đăng nhập bằng demo-user@haru-learning.local / 1234; lượt trả lời được ghi vào file mock Analytics riêng theo tài khoản.
----------------------------------------

--- Trần Quyền <2026-08-10 01:26>------
- Sửa đăng nhập User Service và bổ sung hiện mật khẩu + tài khoản khách.
- Sửa hash mật khẩu demo, đảm bảo run:all khởi động User Service, thêm toggle hiện mật khẩu và nút tiếp tục với tài khoản khách.
----------------------------------------

--- Trần Quyền <2026-08-10 01:32>------
- Sửa User Service không khởi động vì BOM trong package.json.
- Gỡ BOM để service chạy lại; tài khoản khách học được nhưng Analytics chỉ giữ trong RAM, không ghi file.
----------------------------------------

--- Trần Quyền <2026-08-10 02:30>------
- Mở web vào trang chủ trước và thêm đăng ký tài khoản mới.
- Người dùng vào home không bắt buộc đăng nhập; có thể thêm username/mật khẩu mới vào users.json nếu không trùng.
----------------------------------------

--- Trần Quyền <2026-08-10 02:33>------
- Thêm trang API Call Monitor development-only tại API Gateway, lưu tối đa 200 request qua Gateway và các lời gọi Gateway → User/Content/Learning/Analytics.
- Cho phép xem trực quan route, service đích, status, thời gian xử lý, lỗi; có lọc, tạm dừng, mở chi tiết và xóa lịch sử để debug luồng API.
----------------------------------------

--- Trần Quyền <2026-08-10 02:39>------
- Cho phép mở API Call Monitor trực tiếp từ http://localhost:3000 bằng redirect tới /debug/api-calls ở development.
- Giúp truy cập công cụ quan sát Gateway nhanh hơn khi debug luồng nhiều service.
----------------------------------------

--- Trần Quyền <2026-08-10 03:16>------
- Cập nhật README setup môi trường và config cần chuẩn bị.
- Làm rõ pnpm 10.14.0, lockfile, Docker Node 22 / Postgres 17 / RabbitMQ 4, và bảng biến .env theo .env.example.
----------------------------------------
