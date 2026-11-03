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

--- Trần Quyền <2026-08-23 03:31>------
- Tách lớp API auth trong apps/web: types/auth, api/client+endpoints, services/auth.service; LoginPage chỉ gọi authService; nối đúng contract User Service qua Gateway /api/v1/auth (login, register, verify-email, logout).
- UI không còn hard-code fetch URL cũ /api/auth; session dùng accessToken theo User Service Python trên main.
----------------------------------------

--- Trần Quyền <2026-08-23 04:02>------
- Thêm service Docker web (nginx + Vite build) trong docker-compose
- Chạy apps/web qua Docker trên cổng 5173, proxy /api tới api-gateway
----------------------------------------

--- Trần Quyền <2026-08-23 04:07>------
- Đồng bộ UI login web với user-service frontend
- Login có Google, quên/đặt lại mật khẩu, đăng ký/xác minh email giống demo User Service
----------------------------------------

--- Trần Quyền <2026-08-23 04:13>------
- Khôi phục UI login web cũ, chỉ thêm nút thiếu
- Giữ nền/card HARU cũ; thêm Google, quên mật khẩu, reset — không đổi skin user-service
----------------------------------------

--- Trần Quyền <2026-08-23 04:27>------
- Thêm Mailpit làm SMTP local cho user-service
- Dev xem OTP tại :8025 khi chưa cấu hình Gmail; mặc định compose trỏ mailpit
----------------------------------------

--- Trần Quyền <2026-08-24 03:02>------
- Gắn AI Service FastAPI vào docker-compose gốc
- Bật ai-service :3004 + frontend :8081 + ai-postgres; Gateway proxy /api/v1/ai
----------------------------------------

--- Trần Quyền <2026-08-24 03:13>------
- Cấu hình AI Service dùng Groq llama-3.1-8b-instant
- LLM qua OpenAI-compatible base URL Groq; key chỉ nằm trong .env local
----------------------------------------

--- Trần Quyền <2026-08-24 03:35>------
- Thêm benchmark CSV chuẩn và script gọi AI API
- Chạy tests/scripts/run_benchmark.py để đo ngôn ngữ/hội thoại theo bộ case
----------------------------------------

--- Trần Quyền <2026-08-24 03:47>------
- Đơn giản hóa chatbot UI test cho AI service
- UI gửi chat trực tiếp API, tự tạo conversation; Docker :8081 hoặc Vite :5174
----------------------------------------

--- Trần Quyền <2026-08-24 03:50>------
- Làm lại UI chatbot AI service cho dễ nhìn
- Panel chat KITS: welcome gợi ý, bubble/composer gọn, trạng thái API rõ
----------------------------------------

--- Trần Quyền <2026-08-24 04:03>------
- Thêm module format Markdown cho tin nhắn AI
- marked + DOMPurify render HTML an toàn; CSS typography cho list/heading/code
----------------------------------------

--- Trần Quyền <2026-08-24 04:11>------
- Đổi model Groq sang qwen và xử lý tool_use_failed
- Tránh gpt-oss tự gọi tool; strip thẻ think trong reply AI
----------------------------------------

--- Trần Quyền <2026-08-24 04:27>------
- Setup Docker cho Analytics service
- Chạy analytics API local với Compose, healthcheck, volume JSON và Postgres/RabbitMQ sẵn sàng
----------------------------------------

--- Trần Quyền <2026-08-24 04:57>------
- Thêm Content Lesson & Question API với PostgreSQL
- Tạo bài học, nhập từ vựng, tạo/chấm câu hỏi MCQ theo vocabulary và theo dõi contract test qua Docker/Gateway
----------------------------------------

--- Trần Quyền <2026-08-24 05:19>------
- Mở rộng test pyramid và data-driven tracking cho Content service
- Bổ sung unit/contract/PostgreSQL integration/E2E cases TC-01 đến TC-07, I/O timing reports và câu hỏi tổng quát với SET NULL
----------------------------------------

--- Trần Quyền <2026-08-24 05:45>------
- Nối Web với Content và AI Service
- Web tải/chấm bài học qua Gateway, chat HARU HARU với AI, đồng thời thêm seed idempotent cho user test và bài học mẫu
----------------------------------------

--- Trần Quyền <2026-08-24 19:33>------
- Gọn Compose User/AI bằng profile demo
- UI demo auth/chatbot không chạy mặc định; giữ API + Postgres (+ Mailpit)
----------------------------------------

--- Trần Quyền <2026-08-25 21:35>------
- Seed auto user test khi user-service Docker start
- Tài khoản test/test1234 được tạo tự động (SEED_TEST_USER); sửa PYTHONPATH để script seed chạy được
----------------------------------------

--- Trần Quyền <2026-08-26 02:09>------
- Thêm apiContract.csv cho AI, Analytics, Content, Gateway, Web
- Mỗi API một dòng CSV: method, endpoint, request, types, required, response, status, auth, error
----------------------------------------

--- Trần Quyền <2026-08-26 02:18>------
- Bổ sung path/query/body/data_models vào apiContract.csv
- FE+BE dùng chung: tách Path Params, Query Params, Request Body, Data Models
----------------------------------------

--- Trần Quyền <2026-08-26 02:26>------
- Bắt buộc header x-user-id cho AI conversation APIs
- Thiếu/blank x-user-id trả 401; bỏ default anonymous; cập nhật apiContract
----------------------------------------

--- Trần Quyền <2026-08-26 02:38>------
- Web quản lý Content CRUD + API PATCH/DELETE
- Trang Quản lý tạo/sửa/xóa bài học và câu hỏi; Content service thêm endpoints tương ứng
----------------------------------------

--- Trần Quyền <2026-08-26 02:44>------
- Xóa toàn bộ learning-service
- Gỡ app, Compose, Gateway proxy, env và docs liên quan; SRS/review thuộc Analytics
----------------------------------------

--- Trần Quyền <2026-08-26 05:33>------
- Tích hợp gợi ý từ + render HTML markdown vào chat web
- Chat AI hiển thị markdown/HTML và gợi ý câu hỏi typeahead như AI demo
----------------------------------------

--- Trần Quyền <2026-08-26 05:53>------
- Kết nối MCQ với Analytics: vocabularyId, recordReview đúng+sai, ResultPage
- Sau khi làm bài trắc nghiệm, tiến độ từ vựng được ghi vào Analytics và phản ánh trên Dashboard
----------------------------------------

--- Trần Quyền <2026-08-26 05:59>------
- Sửa analytics-service không khởi động (BOM package.json)
- Dashboard và ghi review MCQ hoạt động khi analytics-service chạy trên :3003
----------------------------------------

--- Trần Quyền <2026-08-26 06:04>------
- Dashboard hàng đợi ôn tập + trang flashcard Ôn ngay
- Hàng đợi hiện thời gian chờ còn lại; bấm Ôn ngay để học từ vựng và ghi review vào Analytics
----------------------------------------

--- Trần Quyền <2026-08-26 06:08>------
- Bài tự tạo ghi Analytics + hàng đợi ôn tập scope=queue
- Tự liên kết từ vựng khi soạn/chấm MCQ; Dashboard tải hàng đợi kèm đếm ngược và Ôn ngay
----------------------------------------

--- Trần Quyền <2026-08-26 06:12>------
- Sửa run.cmd: giải phong port analytics + dashboard trả reviews[]
- Tránh process cũ chiếm :3003; Dashboard nạp hàng đợi ôn tập từ API dashboard
----------------------------------------

--- Trần Quyền <2026-08-26 06:14>------
- Sửa run.cmd analytics không mở dialog chọn .json
- Start analytics từ apps/analytics-service thay vì set path .analytics-data.json trong cmd
----------------------------------------

--- Trần Quyền <2026-08-26 06:31>------
- Ổn định run.cmd và kết nối toàn bộ service local
- Dọn process/PID cũ, chạy service không watch, health-check đủ Web/Gateway/Content/Analytics/User/AI và xác minh Gateway→Content→PostgreSQL trước khi báo Done
----------------------------------------

--- Trần Quyền <2026-08-26 16:20>------
- Seed mock data 1 tháng cho user test
- Tạo 5 bài học mẫu mới, 30 từ/câu hỏi và lịch ôn tập Analytics cho userId=1 để mô phỏng dùng app lâu dài
----------------------------------------

--- Trần Quyền <2026-10-26 16:45>------
- Chuyển biến môi trường từ .env gốc vào từng service
- User, Content, AI và Analytics đọc .env trong thư mục của mình; Docker Compose và run.cmd không còn phụ thuộc file .env ở root
----------------------------------------

--- Trần Quyền <2026-10-26 16:49>------
- Bỏ .env.example, chỉ giữ .env trong từng service
- User, Content, Analytics và AI chạy bằng .env của chính service; Web, Mobile và Gateway không cần file env
----------------------------------------

--- Trần Quyền <2026-10-26 17:52>------
- Content: migration Flashcard từ bảng Lesson cũ; tạo database analytics_service và apply migration
- Trang flashcard hết lỗi 500 vì bảng Flashcard đã có; 7 bộ từ và 35 thẻ cũ được giữ trong DB. Analytics cũng có bảng review trên Postgres local.
----------------------------------------

--- Trần Quyền <2026-10-26 17:58>------
- Web: bổ sung giao diện responsive cho màn hình điện thoại 440x956
- Chuyển sidebar thành thanh điều hướng dưới, co giãn nội dung học và biểu đồ, hỗ trợ safe-area và loại bỏ cuộn ngang trên các màn Flashcard, AI, thống kê, ôn tập và đăng nhập.
----------------------------------------

--- Trần Quyền <2026-10-26 18:06>------
- Web: mở rộng Settings theo nhóm My Account và Appearance
- Cho phép đổi Theme Light/Dark/System, mật độ hiển thị, cỡ chữ và ảnh nền với phản hồi tức thời; giữ các mục chưa được app hỗ trợ ra khỏi giao diện.
----------------------------------------

--- Trần Quyền <2026-10-26 18:46>------
- Mobile: thay Expo/React Native bằng Capacitor 7 Android dùng chung apps/web
- Đóng gói toàn bộ React/Vite UI thành APK, kết nối Gateway qua 10.0.2.2, lưu refresh token bằng Android Keystore, hỗ trợ CORS và nút Back native; Google Sign-In native để phase sau.
----------------------------------------

--- Trần Quyền <2026-10-26 19:02>------
- Thêm bộ kiểm thử hiệu năng Grafana k6 trong performance-tests/k6 với inventory, bốn scenario, runner và báo cáo
- Cho phép chạy smoke/load/stress/spike an toàn qua API Gateway, lưu riêng JSONL, summary, dashboard, Markdown và log cho từng lần chạy
----------------------------------------

--- Trần Quyền <2026-11-03 11:41>------
- Viết lại k6 theo từng mức VU, thêm capacity/soak/chat và chạy đo local
- Load 5-50 VU, capacity tới 100 RPS, stress quá tải ở 75-100 VU; kết quả nằm ở performance-tests/k6/KET_QUA_TONG_HOP.md
----------------------------------------

--- Trần Quyền <2026-11-03 11:43>------
- Thêm scripts/schedule-review-examples.ts và scripts/README.md trong Analytics
- Chạy lại ba nhánh lịch ôn (thuộc, không thuộc, người học thật) qua scheduleReview và đối chiếu số input/output đã chốt
----------------------------------------

--- Trần Quyền <2026-11-03 11:58>------
- run:all goi scripts/run-all.mjs de bat them User Service cong 8001
- Web, Gateway, Content, Analytics va User cung len trong mot lenh; AI van chay rieng
----------------------------------------

--- Trần Quyền <2026-11-03 12:17>------
- Bảng thống kê: chuông ôn, nhóm từ đếm ngược/đến lượt, nút Luyện mở quiz
- Khi đến hạn thì chuông và popup hiện; Luyện soạn câu hỏi từ nhóm từ đó và lưu kết quả ôn
----------------------------------------

--- Trần Quyền <2026-11-03 12:35>------
- Thêm tab Lịch học và chuông ôn chung
- Tách từ đến lượt và từ đang chờ sang tab Lịch học, chuông cố định trên mọi màn để luyện nhanh
----------------------------------------

--- Trần Quyền <2026-11-03 12:43>------
- Đổi chuyên cần học tập sang heatmap
- Lưới ô 12 tháng trên bảng thống kê, màu theo số lượt học mỗi ngày
----------------------------------------

--- Trần Quyền <2026-11-03 13:22>------
- Thêm tiến độ và buổi học gần đây vào bảng thống kê
- Hiện số từ đã thuộc, đang học, chuỗi dài nhất, số buổi, tốc độ trả lời và các buổi vừa học
----------------------------------------

--- Trần Quyền <2026-11-03 13:25>------
- Thêm cột từ đã học cạnh buổi học gần đây
- Bảng thống kê hiện hai cột: buổi học gần đây và toàn bộ từ đã học
----------------------------------------

--- Trần Quyền <2026-11-03 13:28>------
- Chia lịch học thành hai cột
- Đến lượt và đang chờ nằm cạnh nhau, mỗi dòng chỉ hiện từ
----------------------------------------

--- Trần Quyền <2026-11-03 13:41>------
- Nạp dữ liệu một tháng cho tài khoản test
- Tạo 10 bộ từ và lịch sử học để tài khoản test trông như đã dùng khoảng một tháng
----------------------------------------

--- Trần Quyền <2026-11-03 14:09>------
- Dockerfile của từng service build trong chính folder đó
- Render chỉ cần Root Directory, không cần Dockerfile Path
----------------------------------------

--- Trần Quyền <2026-11-03 18:53>------
- Gộp Docker Compose về một Postgres
- Một lệnh docker compose up ở gốc repo chạy cả app, mỗi service một database trên cùng server
----------------------------------------

--- Trần Quyền <2026-11-03 19:04>------
- Thêm Dockerfile gốc cho một service Render
- Một image chạy web, gateway và các service, tự tạo bốn database trên một Postgres
----------------------------------------

--- Trần Quyền <2026-11-03 19:19>------
- Giữ tài khoản test và dữ liệu học khi deploy
- Lần chạy đầu tạo nick test cùng bộ từ và lịch sử học, các lần deploy sau không ghi đè
----------------------------------------
