# Lộ trình dự án cho team 7 người

## 1. Mục tiêu và nguyên tắc

Lộ trình này kéo dài **12 tuần**, với mục tiêu bắt buộc là **Web MVP**:

1. Người dùng đăng ký, đăng nhập và xem hồ sơ cơ bản.
2. Người dùng tạo, sửa, xóa bộ flashcard và thẻ flashcard.
3. Người dùng học thẻ, đánh dấu thuộc / chưa thuộc.
4. Người dùng xem danh sách cần ôn và tiến độ học cơ bản.

Luồng demo bắt buộc ở tuần 8:

```text
Web → API Gateway → User / Content / Analytics Service → database riêng
```

Mobile, AI generation và RabbitMQ analytics là milestone tiếp theo, chỉ bắt đầu sau khi Web MVP ổn định. Mỗi người có một vùng ownership lâu dài; họ không chỉ làm một task rồi kết thúc.

## 2. Bảng ownership 7 người

| # | Role | Vùng code sở hữu | Không sở hữu |
| --- | --- | --- | --- |
| 1 | Tech Lead / System Architect | `docs/architecture/`, API contracts, `packages/shared-types/`, `packages/shared-validation/` | Không viết business logic thay các service owner |
| 2 | Web Engineer | `apps/web/` | Không gọi trực tiếp service hoặc DB |
| 3 | Mobile Engineer | `apps/mobile/` | Không làm backend / Gateway |
| 4 | User & Gateway Engineer | `apps/user-service/`, `apps/api-gateway/` | Không sở hữu flashcard, SRS hoặc dashboard data |
| 5 | Content & AI Engineer | `apps/content-service/`, `apps/ai-service/` | Không sở hữu dashboard analytics |
| 6 | Analytics Engineer | `apps/analytics-service/` | Không sửa DB Content hoặc User |
| 7 | Platform Engineer | `infrastructure/`, `docker-compose.yml`, `.env.example` | Không đọc trực tiếp DB của service khác để làm dashboard |

## 3. Bảy workstream cụ thể

### 1. Tech Lead / System Architect

**Làm trong code**
- Chốt REST request/response contracts trước khi Web/Mobile gọi API.
- Quản lý type hoặc validation chỉ khi thực sự cần chia sẻ trong `packages/shared-types/` và `packages/shared-validation/`.
- Review boundary: client → Gateway → service owner; không shared database, không shared business logic.

**Làm ngoài code**
- Tạo backlog, issue template và Definition of Done chung.
- Chủ trì API contract review trước mỗi vertical slice.
- Review PR thay đổi API, service boundary, event contract hoặc shared package.
- Chuẩn bị checklist demo và retrospective cuối phase.

**Deliverables**
- Contract cho Auth, Flashcard, Study/Review, Dashboard.
- Cập nhật `docs/architecture/` khi thay đổi luồng giao tiếp.
- Bằng chứng review/approval cho các PR cross-service.

**Hoàn thành khi**
- Không client nào phụ thuộc URL nội bộ của service.
- Mỗi contract có ví dụ request, response thành công và error shape.

### 2. Web Engineer

**Làm trong code**
- Xây màn hình auth, danh sách bộ thẻ, editor, study mode, review list và dashboard trong `apps/web/`.
- Hiển thị loading, empty, error và success state; giữ accessibility và responsive layout.
- Chỉ gọi API Gateway theo contract đã chốt.

**Làm ngoài code**
- Chuẩn bị luồng demo Web mỗi Friday.
- Báo sớm field API thiếu / UX flow chưa rõ trong contract review.
- Viết checklist browser test cho các luồng chính.

**Deliverables**
- Web MVP có thể đi từ đăng nhập → tạo set → học → xem tiến độ.
- Bằng chứng UI state cho loading, empty, lỗi API và thao tác xóa.

**Hoàn thành khi**
- Không hard-code service URL hoặc chứa auth/SRS/persistence logic ở client.
- Các luồng Web MVP dùng được với Gateway local.

### 3. Mobile Engineer

**Làm trong code**
- Tuần 1–8: chuẩn hóa Expo app shell, navigation plan, design parity và reusable UI primitive trong `apps/mobile/`.
- Tuần 9–11: triển khai auth, danh sách set và study flow dựa trên contract Web đã ổn định.

**Làm ngoài code**
- Review contract từ góc nhìn mobile network/offline/loading state.
- Demo trên thiết bị hoặc Expo Go ở tuần 11.
- Ghi rõ phần nào chưa đạt parity với Web MVP.

**Deliverables**
- Mobile navigation skeleton sẵn sàng sớm.
- First mobile flow: đăng nhập → chọn set → học thẻ.

**Hoàn thành khi**
- Mobile dùng cùng Gateway contract, không copy business logic từ backend.
- Không làm mobile chặn tiến độ Web MVP ở tuần 1–8.

### 4. User & Gateway Engineer

**Làm trong code**
- `apps/user-service/`: Prisma schema/migration, registration, login, password hashing, profile, learning preference.
- `apps/api-gateway/`: route forwarding, auth middleware sau khi contract ổn định, consistent error forwarding.
- Theo layer `routes → controllers → services → repositories → Prisma/DB`.

**Làm ngoài code**
- Publish OpenAPI-style markdown contract hoặc request/response examples trước UI integration.
- Pair với Web ở auth vertical slice; hỗ trợ Mobile khi contract được chốt.
- Viết API test và hướng dẫn biến môi trường local.

**Deliverables**
- Auth/profile API qua Gateway.
- User DB độc lập, migration và test cho auth/error path.

**Hoàn thành khi**
- Web đăng ký/đăng nhập qua Gateway thành công; token/identity được kiểm tra ở boundary.
- Gateway không chứa User business logic; User service không truy cập DB service khác.

### 5. Content & AI Engineer

**Làm trong code**
- Tuần 4–5: `apps/content-service/` sở hữu schema, CRUD flashcard set/card, ownership checks và API cho Gateway.
- Tuần 9–10: `apps/ai-service/` làm một vertical slice sinh vocabulary/quiz có validate output, timeout và error path; AI không ghi trực tiếp Content DB.

**Làm ngoài code**
- Chốt data shape của Flashcard và FlashcardSet cùng Tech Lead/Web.
- Cung cấp seed/demo set cho UI test.
- Document LLM secret/cost/rate-limit assumptions; không commit API key.

**Deliverables**
- Content API hoạt động qua Gateway.
- Một AI request/response đã validate, được Content owner duyệt trước khi lưu content.

**Hoàn thành khi**
- Content vẫn là data owner của flashcard.
- AI failure không làm hỏng CRUD/học core flow.

### 6. Analytics Engineer

**Làm trong code**
- Tuần 6–7: `apps/analytics-service/` sở hữu review record, mastered status, due review và SRS scheduling nhẹ.
- Tuần 9–10: định nghĩa/consume event học tập qua RabbitMQ sau khi core flow ổn định.
- Tạo test cho scheduling và transition thuộc/chưa thuộc.

**Làm ngoài code**
- Chốt yêu cầu SRS “phiên bản 1” có thể giải thích được (input, output, due date).
- Pair với Web để xác nhận study interaction.
- Cung cấp event/API contract cho Platform.

**Deliverables**
- Học một thẻ → lưu review → cập nhật due review/progress.
- Event/API contract có thể idempotent phía consumer.

**Hoàn thành khi**
- Analytics không thay đổi Flashcard data của Content.
- Dashboard đọc derived data từ Analytics DB/read model riêng.

### 7. Platform Engineer

**Làm trong code**
- Tuần 1: hoàn thiện local runbook, Docker Compose, Postgres database/volume riêng, RabbitMQ local, `.env.example`.
- Tuần 8: hỗ trợ chạy end-to-end Web MVP bằng local environment có thể lặp lại.
- Tuần 9–11: hỗ trợ hạ tầng cho Analytics consume events nếu cần.

**Làm ngoài code**
- Owner của `docker compose` workflow và troubleshooting guide.
- Chạy integration smoke test trước Friday demo.
- Ghi các production gap: health check, graceful shutdown, log/metrics — chưa tự thêm hạ tầng nếu chưa cần.

**Deliverables**
- Một lệnh/documented flow để team chạy dependencies local.
- Analytics read model idempotent và dashboard API cơ bản.

**Hoàn thành khi**
- Mỗi service có DB/volume riêng; không có shared Prisma client.
- Analytics chỉ tiêu thụ event/API và sở hữu DB/read model riêng.

## 4. Lộ trình end-to-end 12 tuần

| Thời gian | Mục tiêu tích hợp | Owner chính | Handoff / bằng chứng để qua phase |
| --- | --- | --- | --- |
| Tuần 1 | Baseline chạy được: workspace, client entry, DB/RabbitMQ topology, coding/API convention | Tech Lead + Platform | Mỗi người chạy typecheck; Platform có runbook; Tech Lead chốt error format và contract template |
| Tuần 2–3 | Identity vertical slice: Web đăng ký/đăng nhập qua Gateway → User DB | User/Gateway + Web | Auth contract được duyệt; API/error test; Web demo loading/error/success |
| Tuần 4–5 | Content vertical slice: tạo/sửa/xóa set/card trên Web qua Gateway → Content DB | Content/AI + Web | Flashcard contract; Content migration/test; Web editor/list/empty state demo |
| Tuần 6–7 | Learning vertical slice: chọn card → học → thuộc/chưa thuộc → review/progress | Learning + Web | SRS v1 test; integration demo; xác nhận Content vẫn là card data owner |
| Tuần 8 | Web MVP quality gate | Cả team, Tech Lead điều phối | E2E demo, test/typecheck, runbook, docs, known-issues list; freeze core scope |
| Tuần 9–10 | AI và event analytics foundation | Content/AI + Learning + Platform | AI output validation/timeout; `StudyCompleted` contract; Analytics consumer idempotent |
| Tuần 11 | Mobile first flow + dashboard | Mobile + Platform + Web | Expo demo auth→study; dashboard đọc Analytics API qua Gateway |
| Tuần 12 | Hardening, final demo, retrospective | Cả team | Security/error review, contract compatibility, Docker walkthrough, final docs and demo recording |

### Critical path

```text
Auth contract
  → Web auth + User/Gateway
  → Content contract + Web editor
  → Learning contract + Web study flow
  → Web MVP quality gate
  → Event contract
  → Analytics dashboard + Mobile flow
```

### Công việc song song không chặn MVP

- Mobile app shell/design parity (Tuần 1–8).
- AI design và prompt/output contract draft (Tuần 4–8), không gọi LLM production trước tuần 9.
- Analytics read-model design và Compose/runbook (Tuần 1–8), không đọc Learning DB.

### Khi dependency bị trễ

- Gateway/User trễ: Web dùng typed API adapter mock tạm thời; không tự gọi User service.
- Content trễ: Web làm editor state với contract fixture; Learning không tạo bảng flashcard copy.
- Learning trễ: Web demo study UI với fixture; không đưa SRS vào client.
- RabbitMQ/Analytics trễ: Web MVP chỉ hiển thị tiến độ do Learning sở hữu; không gọi đó là dashboard analytics. Dashboard statistics chỉ xuất hiện khi Analytics read model sẵn sàng.

## 5. Quy trình làm việc mỗi tuần

| Thời điểm | Hoạt động | Kết quả |
| --- | --- | --- |
| Thứ Hai | Planning 30–45 phút | Chọn scope tuần, owner, dependency, Definition of Done |
| Trước khi code cross-service | Contract review | Request/response/event example và owner approval |
| Giữa tuần | Integration check | Phát hiện contract mismatch sớm |
| Thứ Sáu | Demo + quality gate | Demo luồng thật, test/typecheck, known issues, quyết định tuần sau |

### Quy tắc PR

1. PR của service cần owner service review.
2. PR thay đổi boundary/API/event/shared package cần Tech Lead review.
3. PR hạ tầng/Compose/environment cần Platform review.
4. Không merge code truy cập DB của service khác.
5. Change lớn chạy `corepack pnpm log "..." "..."`; thay đổi architecture/contract phải cập nhật `docs/architecture/`.

## 6. Definition of Done chung

Một task chỉ hoàn thành khi:

- Đúng ownership folder và layer service.
- Có happy path, error path, loading/empty state nếu có UI.
- Có typecheck/test phù hợp với phần đã thay đổi.
- API/event contract được consumer liên quan xác nhận.
- Có ghi chú run/demo nếu cần môi trường đặc biệt.
- Không đưa secret, direct service URL ở client, shared DB hoặc business logic sai boundary vào code.

## 7. Demo cuối cùng

Cuối tuần 12, team demo theo thứ tự:

1. Người dùng đăng ký/đăng nhập trên Web qua Gateway.
2. Người dùng tạo một flashcard set và card.
3. Người dùng học card, đánh dấu thuộc/chưa thuộc và thấy review/progress thay đổi.
4. Learning phát `StudyCompleted`; Analytics cập nhật dashboard read model.
5. Mobile chạy flow học cơ bản cùng contract.
6. Platform chạy local topology, giải thích DB riêng, RabbitMQ và các giới hạn chưa xử lý.
