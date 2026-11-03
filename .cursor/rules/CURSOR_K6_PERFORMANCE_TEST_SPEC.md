# CURSOR IMPLEMENTATION SPEC — GRAFANA k6 PERFORMANCE TESTING

## 0. Vai trò và mục tiêu

Bạn là coding agent đang làm việc trên **repository hiện tại**. Hãy **khảo sát source thật trước khi viết test**, rồi triển khai một bộ kiểm thử hiệu năng backend API với Grafana k6. Web React/TypeScript và mobile app (nếu có) có thể dùng chung backend; không cần kiểm thử UI ở pha này.

Kết quả cần đạt: có thể chạy **smoke, load, stress, spike** bằng một lệnh, tự tạo **một thư mục kết quả mới cho mỗi lần chạy**, xuất được **JSON raw, JSON summary, HTML dashboard, báo cáo Markdown, log**; không trộn bất kỳ file kết quả nào vào source ứng dụng.

**Không tự nhận đã chạy thành công hoặc bịa số liệu nếu không thể khởi động backend/k6.** Trong trường hợp thiếu điều kiện, hãy triển khai code, ghi rõ cách chạy và trạng thái `NOT_RUN`.

## 1. Nguyên tắc và phạm vi

1. Chỉ thêm thư mục `performance-tests/k6/` tại root của repository. Không sửa business logic, giao diện hay API để phục vụ test, trừ khi thật sự cần và phải giải thích riêng.
2. **Tuyệt đối không đoán endpoint**. Dò router/controller, API client (`fetch`, `axios`...), OpenAPI/Swagger và file cấu hình. Chỉ đưa vào test endpoint có thật. Cần phân biệt URL frontend và URL backend.
3. Ghi lại `METHOD`, `PATH`, chức năng, payload, yêu cầu authentication, HTTP success code và rủi ro ghi dữ liệu trong `ENDPOINT_INVENTORY.md`. Nếu endpoint không xác minh được, đánh dấu `UNVERIFIED` và không chạy.
4. Chỉ test trên **local/staging** hoặc target đã được người vận hành cho phép. Mặc định từ chối production, public domain lạ và target trống. Không tự động chạy stress/spike khi thiếu xác nhận môi trường.
5. Không hardcode token, mật khẩu, URL nội bộ nhạy cảm, PII, API key trong mã nguồn hoặc log. Không commit `.env` hay thư mục `results/`.
6. Test ghi dữ liệu chỉ dùng tài khoản/dataset test, có cơ chế cleanup khi phù hợp; không gọi tác vụ không thể đảo ngược (email hàng loạt, thanh toán, xoá dữ liệu thật, gọi AI có chi phí cao) khi chưa được phép.
7. Ưu tiên `.js` thuần cho k6 để chạy trực tiếp; không bắt buộc TypeScript bundler chỉ vì project UI dùng `.tsx`/`.ts`. Có thể dùng Node.js `run.mjs` cho phần điều phối/chuyển đổi kết quả.
8. Nếu backend dùng SSE, WebSocket hay streaming, nhận diện và nêu rõ KPI chuyên biệt (ví dụ time-to-first-event); không dùng riêng `http_req_duration` để đại diện cho toàn bộ trải nghiệm streaming.

## 2. Cấu trúc bắt buộc

```text
PROJECT_ROOT/
└── performance-tests/
    └── k6/
        ├── README.md
        ├── TEST_PLAN.md
        ├── ENDPOINT_INVENTORY.md
        ├── .env.example
        ├── .gitignore
        ├── scenarios/
        │   ├── smoke.js
        │   ├── load.js
        │   ├── stress.js
        │   └── spike.js
        ├── lib/
        │   ├── config.js
        │   ├── requests.js
        │   └── summary.js
        ├── scripts/
        │   ├── run.mjs
        │   └── generate-report.mjs
        └── results/
            └── YYYY-MM-DD_HH-mm-ss_<scenario>/
                ├── run-info.json
                ├── summary.json
                ├── metrics.jsonl
                ├── dashboard.html
                ├── report.md
                └── console.log
```

`results/` phải được `.gitignore`. Nếu dự án có nhiều lần chạy trong cùng một giây, bổ sung hậu tố ID để tránh ghi đè. Giữ đường dẫn tương đối theo root trong tài liệu; script runner xử lý an toàn trên Windows PowerShell và Linux/macOS.

## 3. Khảo sát codebase (bắt buộc làm trước)

- Xác định framework frontend, vị trí backend, URL API theo môi trường, cơ chế auth, cách cấp test token, API route thực tế.
- Từ API có thật, chọn **một luồng người dùng thường gặp** với ít nhất một API đọc, và có thể thêm đăng nhập/tìm kiếm/gửi yêu cầu nếu hợp lệ và an toàn.
- Không gọi lặp login trên mỗi request nếu điều đó gây rate-limit/lockout; tái sử dụng token hoặc cấp nhiều tài khoản test theo thiết kế auth.
- Liệt kê trường hợp chưa hỗ trợ và nguyên nhân trong `ENDPOINT_INVENTORY.md`.
- Phân biệt kiểm thử backend với kiểm thử tốc độ render UI: k6 HTTP không đo FPS hay tương tác native của mobile.

## 4. Cấu hình

Tạo `.env.example`, ví dụ các tên biến (không điền secret):

```dotenv
BASE_URL=
TARGET_ENV=local
TEST_AUTH_TOKEN=
TEST_USERNAME=
TEST_PASSWORD=
ALLOW_NON_LOCAL_TESTS=false
CONFIRM_HIGH_LOAD=false
MAX_VUS=30
P95_LIMIT_MS=1000
ERROR_RATE_LIMIT=0.01
```

- Hỗ trợ `BASE_URL`, thông tin auth và ngưỡng truyền vào runtime.
- Thiếu `BASE_URL` thì báo lỗi rõ, không đoán URL.
- `TARGET_ENV=production` bị chặn mặc định; chỉ có thể nới lỏng bằng cấu hình phê duyệt riêng, không tự động bật.
- Giới hạn số VU mặc định thấp và cấu hình được; không tự động bắn 1.000 VUs.
- `README.md` ghi rõ cách sao chép `.env.example` thành `.env`, cài k6, kiểm tra `k6 version`, khởi động backend và chạy test.

## 5. Test scenarios

**A. Smoke (`scenarios/smoke.js`)**
- 1–2 VUs, khoảng 15–30 giây hoặc một số iteration nhỏ.
- Mục đích: kiểm tra URL, xác thực, response và metric pipeline.
- Chạy đầu tiên, không tự động đi tiếp nếu smoke thất bại.

**B. Load (`scenarios/load.js`)**
- Tăng tải từng bước, ví dụ 5 → 10 → 20 VUs (các mức này là mặc định an toàn, phải dễ cấu hình).
- Giữ tải tại từng bước đủ lâu để lấy dữ liệu.
- Mục đích: đo p95, throughput, error rate ở tải dự kiến.

**C. Stress (`scenarios/stress.js`)**
- Tăng tải theo từng nấc đến giới hạn `MAX_VUS` được phê duyệt.
- Mục đích: nhận diện mức tải bắt đầu vi phạm threshold.
- Bắt buộc `CONFIRM_HIGH_LOAD=true` và target hợp lệ; không tự ý chạy production.

**D. Spike (`scenarios/spike.js`)**
- Mô phỏng tăng VUs đột ngột rồi hồi phục (ví dụ 5 → 20 → 5).
- Mục đích: xem error rate/latency khi có burst và sau khi phục hồi.
- Cùng biện pháp an toàn như stress.

Ở cả bốn kịch bản:
- Dùng `group()` để nhóm hành vi, `tags.name` ổn định để báo cáo theo endpoint.
- Dùng `check()` để kiểm tra status và nội dung đáp ứng khi phù hợp.
- Dùng `sleep()` để có think-time hợp lý, tránh vòng lặp nhanh phi thực tế.
- Dùng k6 `thresholds` để PASS/FAIL: mặc định minh họa `http_req_duration: p(95)<1000` (ms), `http_req_failed: rate<0.01`; có thể thêm `checks: rate>0.99` nếu có checks thực tế. Hãy giải thích đây là **ngưỡng mẫu cần hiệu chỉnh theo SLO của dự án**, không phải chuẩn chung cho mọi API.
- Đối với API xử lý dài/streaming, định nghĩa ngưỡng riêng thay vì áp dụng cứng 1s.
- Đánh dấu status code thành công theo contract endpoint, không giả định mọi endpoint đều trả 200.

## 6. Runner: `scripts/run.mjs`

Thiết kế CLI dùng Node.js, không phụ thuộc vào terminal shell cụ thể:

```powershell
node performance-tests/k6/scripts/run.mjs smoke
node performance-tests/k6/scripts/run.mjs load
node performance-tests/k6/scripts/run.mjs stress
node performance-tests/k6/scripts/run.mjs spike
```

Yêu cầu runner:
1. Đọc cấu hình từ `performance-tests/k6/.env` nếu tồn tại, kết hợp environment variables; không in secrets.
2. Kiểm tra có binary `k6` trong PATH, `BASE_URL` hợp lệ, target không bị cấm; với stress/spike cần xác nhận high load.
3. Tạo **thư mục kết quả duy nhất** `results/YYYY-MM-DD_HH-mm-ss_<scenario>/` trước khi chạy.
4. Ghi `run-info.json`: `run_id`, `scenario`, `started_at`, `finished_at`, `duration_seconds`, `target_env`, `base_url` đã loại bỏ credentials/query secrets, k6 version, git commit nếu có, thông số load, các threshold, trạng thái, `exit_code`.
5. Chạy `k6 run` từ Node `child_process.spawn` (không nối chuỗi lệnh shell không an toàn), `--out json=<absolute-path-to-metrics.jsonl>` và truyền `-e BASE_URL=...`, `-e SUMMARY_PATH=...` cùng tham số an toàn cần thiết.
6. Bật dashboard HTML export với các environment variables:
   - `K6_WEB_DASHBOARD=true`
   - `K6_WEB_DASHBOARD_EXPORT=<absolute-path-to-dashboard.html>`
   - `K6_WEB_DASHBOARD_PORT=-1` cho môi trường chạy tự động nếu phù hợp
   - `K6_WEB_DASHBOARD_PERIOD=1s` hoặc giá trị hợp lý để smoke test ngắn vẫn có đồ thị (dashboard có thể không đủ dữ liệu khi test quá ngắn).
7. Ghi đồng thời stdout/stderr vào `console.log`, và hiển thị progress ra terminal.
8. Kết thúc thì **vẫn tạo `report.md` dù threshold fail hoặc `k6` thoát non-zero**; nếu không có dữ liệu thì ghi `INCOMPLETE/ERROR`, nêu lý do, tuyệt đối không bịa metric.
9. `run.mjs` trả về exit code phù hợp với kết quả k6; threshold fail phải khiến CI nhận non-zero.
10. Không ghi đè kết quả của lần chạy khác, không chứa token/user PII trong report.

## 7. Xây dựng output đúng

### `summary.json`
- Trong k6 dùng `export function handleSummary(data) { ... }` để ghi JSON tổng hợp đến `__ENV.SUMMARY_PATH`.
- Nếu tùy biến summary, đảm bảo vẫn có thông tin người chạy cần trên terminal/log (ví dụ ghi `stdout` hoặc hiển thị báo cáo cuối từ runner); không âm thầm làm mất kết quả.
- `summary.json` là **đối tượng summary k6 thực** (bao gồm metric/threshold), không phải raw request stream.

### `metrics.jsonl`
- Dùng `k6 run --out json=<path>`.
- Đây là **newline-delimited JSON**, mỗi dòng là một record metric theo thời gian, không phải một JSON object duy nhất.
- Không bật log response body/token; tránh kích thước quá lớn, mô tả cách giới hạn/giữ file.

### `dashboard.html`
- Xuất HTML self-contained bằng built-in web dashboard của k6 (`K6_WEB_DASHBOARD_EXPORT`).
- Chỉ nhận là đã tạo nếu file thực sự tồn tại; ghi cảnh báo khi dashboard không hỗ trợ trong phiên bản k6 đã cài.

### `report.md`
Tạo tự động bằng `scripts/generate-report.mjs`, từ số liệu thực tế của `summary.json` và `run-info.json`, có cấu trúc:

1. **Thông tin lần chạy**: run ID, thời gian, environment, target đã ẩn secret, commit, scenario, VUs/stages, duration, trạng thái.
2. **Summary table**: `http_reqs` (total/rate), `http_req_duration` (avg, median, p90, p95, p99, max nếu có), `http_req_failed`, `checks`, `iterations`, `dropped_iterations` nếu có.
3. **Threshold results**: điều kiện, số đo, PASS/FAIL; phân biệt lỗi chạy tool và fail threshold.
4. **Per-endpoint**: các nhóm `name`/tag nếu có đủ metric; nếu chưa hỗ trợ tổng hợp, ghi rõ `NOT_AVAILABLE`, không bịa.
5. **Nhận xét có điều kiện**: chỉ kết luận điều được dữ liệu chứng minh; không khẳng định CPU/RAM/DB bottleneck khi chưa có monitoring.
6. **Kết luận**: `PASS`, `FAIL`, `INCOMPLETE` và việc cần làm tiếp.
7. **Liên kết tương đối** đến `dashboard.html`, `summary.json`, `metrics.jsonl`, `console.log`.

Nếu tổng hợp thất bại, vẫn tạo `report.md` tối thiểu nêu chính xác lỗi. Có thể bổ sung đồ thị, nhưng không yêu cầu cài thêm Grafana Server/InfluxDB chỉ để xuất HTML.

### `console.log`
- Chứa lệnh/chế độ chạy đã redact secrets, dòng k6, error stack, threshold summary và nguyên nhân nếu fail.

## 8. Kế hoạch kiểm thử và cách đánh giá

Viết `TEST_PLAN.md` trình bày:
- Mục đích, phạm vi (API/backend, không phải FPS UI), điều kiện môi trường và giới hạn tải.
- User journey → API tương ứng → dữ liệu test → tiêu chí success.
- Smoke → Load → Stress → Spike; chỉ chạy high-load khi được xác nhận.
- KPI: p50/avg/p90/p95/p99, RPS, error rate, check success rate, iterations, dropped iterations (nếu có).
- Các ngưỡng đánh giá nêu rõ là **giả định ban đầu** để chủ dự án xác nhận.
- Cách lặp lại test sau thay đổi code và cách so sánh với baseline.
- Lưu ý: số VUs không đồng nghĩa số người dùng online thực; kết quả phụ thuộc kịch bản, think-time, môi trường, tài nguyên và dịch vụ ngoài.

## 9. Validation / Acceptance Criteria

- [ ] Khảo sát được source thật, có `ENDPOINT_INVENTORY.md` mô tả rõ endpoint đã xác minh và chưa xác minh.
- [ ] Toàn bộ code/test artifacts chỉ nằm trong `performance-tests/k6/` (ngoại trừ thay đổi tối thiểu được giải thích rõ, nếu có).
- [ ] Không có URL, auth credential giả lập được mặc định coi là thật.
- [ ] Có đủ bốn kịch bản; smoke hoạt động với endpoint hợp lệ nếu backend/k6 sẵn sàng.
- [ ] Một lệnh runner tạo **một folder kết quả duy nhất**, không ghi đè lịch sử.
- [ ] Folder kết quả có 6 file đúng tên: `run-info.json`, `summary.json`, `metrics.jsonl`, `dashboard.html`, `report.md`, `console.log` khi k6 chạy thành công. Với lỗi khởi tạo, có `run-info.json`, `console.log`, `report.md` mô tả trạng thái và thiếu file nào.
- [ ] `report.md` dùng số liệu thật; có PASS/FAIL/INCOMPLETE, không ghi giá trị ngẫu nhiên/giả định như dữ liệu đo.
- [ ] Threshold fail cho exit code non-zero; file report vẫn được tạo.
- [ ] `results/`, `.env` bị ignore và không lộ secret.
- [ ] Test được trên Windows PowerShell theo README (đủ lệnh cài k6, chạy, mở HTML và đọc report).
- [ ] Không tự chạy stress/spike trên production/địa chỉ public.

## 10. Cách bàn giao của Cursor

Sau khi hoàn thành:
1. Tóm tắt endpoint/luồng nào đã thực sự tìm thấy trong source.
2. Liệt kê các file đã tạo và mọi file ngoài `performance-tests/k6/` đã thay đổi (nếu có).
3. Cho biết lệnh smoke/load/stress/spike trên PowerShell.
4. Nói rõ **đã chạy test hay chưa**, lý do và kết quả thật nếu có.
5. Trỏ đến **đường dẫn lần chạy gần nhất** và nhắc `report.md` + `dashboard.html` là hai sản phẩm đầu tiên cần xem.
6. Liệt kê các điểm cần người chủ dự án cung cấp: backend URL, tài khoản test, expected status/payload, SLO được duyệt, giới hạn max VUs, môi trường staging.

## 11. Tham khảo kỹ thuật chính thức

- Dashboard + export HTML: https://grafana.com/docs/k6/latest/results-output/web-dashboard/
- Custom summary `handleSummary()`: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- JSON streaming output: https://grafana.com/docs/k6/latest/results-output/real-time/json/
- Scenarios: https://grafana.com/docs/k6/latest/using-k6/scenarios/
- Thresholds: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Environment variables: https://grafana.com/docs/k6/latest/using-k6/environment-variables/

**Thực hiện luôn trong repository hiện tại; không dừng lại ở việc đề xuất kiến trúc. Ưu tiên code rõ ràng, dễ chạy, có khả năng lặp lại và báo cáo có thể kiểm chứng.**
