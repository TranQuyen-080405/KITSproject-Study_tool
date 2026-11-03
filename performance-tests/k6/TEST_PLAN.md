# Kế hoạch kiểm thử hiệu năng backend

## Mục đích và phạm vi

Đo latency, throughput, error rate và độ ổn định của luồng đọc phổ biến qua API Gateway. Phạm vi gồm Gateway, xác thực và các API Content/Analytics mà web và Capacitor cùng sử dụng. Không đo hiệu năng render UI, FPS, thời gian khởi động Android hoặc mạng vô tuyến thực tế.

Chỉ chạy trên local/staging được cho phép. Production bị chặn. Stress, spike, soak và capacity cần `CONFIRM_HIGH_LOAD=true`. `MAX_VUS` chỉ là trần VU của executor capacity, không phải năng lực đã đo.

## User journey và dữ liệu

1. Runner lấy token được cung cấp, hoặc login một lần bằng tài khoản test.
2. Kiểm tra Gateway health.
3. Đọc hồ sơ người dùng.
4. Mở danh sách bộ thẻ và chi tiết bộ đầu tiên nếu có.
5. Mở dashboard học tập.
6. Đọc danh sách review đến hạn.
7. Nghỉ theo think-time rồi lặp lại.

Journey chỉ đọc, ngoại trừ login ghi refresh-token hash đúng một lần. Dữ liệu cần có là một tài khoản test hợp lệ; bộ thẻ có thể rỗng mà list vẫn hợp lệ. Không dùng user thật, token thật hoặc PII trong `.env`, log và report.

## Thứ tự chạy

1. **Smoke**: 1 VU trong 1 phút. Xác minh URL, auth, contract và metric.
2. Chỉ khi smoke có summary hợp lệ mới chạy **Load**. Mỗi mức 5, 10, 20, 30, 50 VU là một lần `constant-vus` giữ 3 phút, lặp 3 lần. Không gộp các mức vào một giá trị p95.
3. **Capacity**: `constant-arrival-rate` ở RATE 5, 10, 15, 20 iteration/giây, mỗi mức 3 phút, không think time.
4. **Stress**: giữ lần lượt 30, 50, 75, 100 VU, mỗi mức 3 phút, chuyển mức trong 20 giây.
5. **Spike**: 1 phút ở 10 VU, 5 giây lên 75 VU, giữ 2 phút, 5 giây về 10 VU, giữ 2 phút.
6. **Soak**: 30 VU trong 30 phút.
7. **Chat**: 3 request, 1 VU. Đo thời gian đủ phản hồi. API không stream nên không có time to first token.
8. Dừng mức VU hoặc RATE cao hơn nếu lỗi HTTP đạt 5%, checks dưới 95%, Gateway không trả lời, hoặc máy còn dưới 350 MB RAM trống.

`run-suite.mjs` nối các pha và áp dụng điều kiện dừng. `run.mjs` vẫn chỉ chạy một kịch bản.

## KPI

- `http_req_duration`: avg, median/p50, p90, p95, p99, max.
- `http_reqs`: tổng request và RPS.
- `http_req_failed`: error rate.
- `checks`: tỷ lệ contract check thành công.
- `iterations`, `dropped_iterations`.
- Submetric latency theo tag endpoint nếu phiên bản k6 xuất đủ dữ liệu.

Số VUs không đồng nghĩa số người dùng online thực. Kết quả phụ thuộc journey, think-time, dữ liệu, môi trường, tài nguyên và trạng thái của từng service.

## Threshold ban đầu

- Tổng thời gian HTTP của GET: `p(95) < P95_LIMIT_MS`, mặc định 500 ms, và `p(99) < P99_LIMIT_MS`, mặc định 1000 ms.
- HTTP failed rate `< ERROR_RATE_LIMIT`, mặc định 1%.
- Check success rate `> 99%`.
- Capacity thêm `dropped_iterations == 0`.
- Lỗi từ 5% làm k6 dừng sớm (`abortOnFail`) để không tiếp tục đốt máy local. Mốc 1% vẫn là điều kiện FAIL của lần chạy.

Đây là giả định khởi đầu, không phải chuẩn chung. Chủ dự án cần duyệt SLO trước khi dùng threshold làm release gate. Endpoint LLM nếu được kiểm thử sau này phải có scenario và threshold latency riêng.

## PASS/FAIL

- **PASS**: k6 hoàn tất và mọi threshold đều đạt.
- **FAIL**: ít nhất một threshold thực tế không đạt; runner trả exit code non-zero.
- **INCOMPLETE**: thiếu k6/backend/auth, tool lỗi hoặc không có summary hợp lệ.

Không suy luận CPU, RAM hoặc database bottleneck chỉ từ HTTP latency. Muốn kết luận nguyên nhân phải đối chiếu monitoring service/database trong cùng khoảng thời gian.

## Baseline và lặp lại

1. Giữ cùng commit hoặc ghi commit trong `run-info.json`.
2. Giữ cùng target, dữ liệu test, VUs, duration, think-time và threshold.
3. Chạy smoke rồi scenario cần so sánh.
4. So sánh `report.md` và `summary.json` giữa các thư mục kết quả, ưu tiên p95, RPS, error rate và dropped iterations.
5. Ghi nhận mọi khác biệt hạ tầng trước khi kết luận regression.

Raw `metrics.jsonl` có thể lớn. Chỉ giữ các baseline cần thiết ở kho artifact ngoài Git; `results/` luôn bị ignore.
