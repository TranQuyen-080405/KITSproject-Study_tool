# Grafana k6 performance tests

Bộ test backend qua API Gateway, dùng chung cho luồng Web và Capacitor. Đọc [TEST_PLAN.md](./TEST_PLAN.md) và [ENDPOINT_INVENTORY.md](./ENDPOINT_INVENTORY.md) trước khi tăng tải.

## 1. Cài k6

Windows PowerShell:

```powershell
winget install --id GrafanaLabs.k6 --exact
k6 version
```

Hoặc dùng Chocolatey:

```powershell
choco install k6
k6 version
```

macOS/Linux: làm theo hướng dẫn chính thức tại <https://grafana.com/docs/k6/latest/set-up/install-k6/>.

Built-in web dashboard export cần phiên bản k6 hiện hành. Runner sẽ cảnh báo nếu `dashboard.html` không được tạo.

## 2. Khởi động backend và seed user test

Từ root repository, ưu tiên full Docker stack để Gateway, User, Content và Analytics cùng sẵn sàng:

```powershell
docker compose up -d --build
docker compose exec user-service python scripts/seed_test_user.py
```

Gateway phải phản hồi tại:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

`pnpm run:all` khởi động cả User Service trên cổng 8001. AI Service vẫn chạy riêng bằng `pnpm run:ai`.

## 3. Cấu hình

```powershell
Copy-Item performance-tests/k6/.env.example performance-tests/k6/.env
```

Điền một trong hai cách xác thực:

```dotenv
TEST_AUTH_TOKEN=<short-lived-test-token>
```

hoặc:

```dotenv
TEST_USERNAME=<dedicated-test-username>
TEST_PASSWORD=<dedicated-test-password>
```

Không commit `.env`. Không dùng tài khoản thật. `BASE_URL` là Gateway, không phải URL frontend. Target production luôn bị chặn; target không phải local cần `ALLOW_NON_LOCAL_TESTS=true`.

## 4. Chạy theo thứ tự

Các mức VU là cấu hình thử nghiệm. Trên máy local, dừng nếu API hoặc máy quá tải. Bộ đầy đủ:

```powershell
node performance-tests/k6/scripts/run-suite.mjs
```

Thứ tự của suite: smoke 1 VU × 1 phút; load `constant-vus` riêng ở 5, 10, 20, 30 và 50 VU, mỗi mức 3 phút × 3 lần; capacity `RATE` 5, 10, 15, 20 trong 3 phút; stress 30→50→75→100 VU giữ mỗi mức 3 phút; spike 10→75→10; soak 30 VU × 30 phút; chat 3 request. Suite tự bật `CONFIRM_HIGH_LOAD` cho các kịch bản nặng và dừng mức cao hơn khi lỗi HTTP từ 5% hoặc Gateway không còn trả lời.

Chạy lẻ:

```powershell
node performance-tests/k6/scripts/run.mjs smoke
$env:VUS = "5"
node performance-tests/k6/scripts/run.mjs load
$env:CONFIRM_HIGH_LOAD = "true"
$env:RATE = "10"
node performance-tests/k6/scripts/run.mjs capacity
node performance-tests/k6/scripts/run.mjs stress
node performance-tests/k6/scripts/run.mjs spike
node performance-tests/k6/scripts/run.mjs soak
node performance-tests/k6/scripts/run.mjs chat
```

Capacity không nghỉ 1 giây giữa các vòng. Load vẫn nghỉ 1 giây sau mỗi vòng GET. Ngưỡng GET mặc định là p95 dưới 500 ms và p99 dưới 1000 ms. Chat không dùng ngưỡng đó; API hiện không stream nên không có time to first token.

## 5. Output

Mỗi lệnh tạo thư mục riêng:

```text
performance-tests/k6/results/YYYY-MM-DD_HH-mm-ss_<scenario>/
```

Khi k6 chạy thành công:

- `run-info.json`: target đã redacted, commit, cấu hình tải, trạng thái và exit code.
- `summary.json`: summary thật từ `handleSummary()`.
- `metrics.jsonl`: raw metric stream, một JSON record mỗi dòng.
- `dashboard.html`: dashboard self-contained từ built-in k6 web dashboard.
- `report.md`: báo cáo PASS/FAIL/INCOMPLETE tạo từ summary thật.
- `console.log`: stdout/stderr k6 và lỗi runner.

Nếu lỗi trước khi k6 khởi động, runner vẫn tạo `run-info.json`, `console.log`, `report.md` với trạng thái INCOMPLETE/ERROR. Không có metric giả.

Hai file nên xem đầu tiên:

```powershell
Get-Content performance-tests/k6/results/<run-id>/report.md
Start-Process performance-tests/k6/results/<run-id>/dashboard.html
```

`results/` bị Git ignore. `metrics.jsonl` có thể lớn; xóa hoặc lưu ngoài Git sau khi đã giữ baseline cần thiết.

## 6. Exit code và CI

- Exit code `0`: k6 chạy xong và threshold đạt.
- Exit code non-zero: threshold fail, lỗi contract hoặc lỗi tool/backend.
- Report vẫn được sinh khi threshold fail.

Threshold GET mặc định p95 dưới 500 ms, p99 dưới 1000 ms, failed rate dưới 1%, checks trên 99% chỉ là mốc thử nghiệm, chưa phải SLO phát hành.

## 7. An toàn

- Không chạy production.
- Không chạy stress/spike nếu chưa bật xác nhận.
- Scenario mặc định không tạo/xóa content, không ghi review/session và không gọi LLM.
- Không bật response-body debug vì có thể lộ token/PII.
- Dừng ở smoke nếu contract hoặc môi trường chưa hợp lệ.
