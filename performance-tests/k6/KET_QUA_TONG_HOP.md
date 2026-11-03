# Tổng hợp kiểm thử hiệu năng k6

Số trong các bảng lấy từ `summary.json` của từng lần chạy. Ô không có summary hợp lệ để `—`. Các mức VU và RATE là cấu hình thử nghiệm, không phải năng lực đã được chứng nhận.

User service của lần đo này chạy với `ACCESS_TOKEN_MINUTES=180` để soak 30 phút không hết hạn token giữa chừng. Mặc định trong code service là 15 phút.

Ngưỡng đánh giá GET: p95 dưới 500 ms, p99 dưới 1000 ms, lỗi HTTP dưới 1%, checks trên 99%. Đây là mốc thử nghiệm, chưa phải SLO phát hành.

## Điều kiện đo

- Target: `http://localhost:3000`
- Môi trường: `local`
- k6: `k6.exe v2.2.0 (commit/00a9a1b7f5, go1.26.5, windows/amd64)`
- Git commit: `35e790dbd383758cf0d1158e4d3188c73559ba13`
- Think time của smoke, load, stress, spike và soak: 1 giây sau mỗi vòng 5 GET.
- Capacity không nghỉ giữa vòng. k6 tự tạo số iteration mỗi giây.
- CPU, RAM và số kết nối Postgres lấy trên máy đang chạy test. Bộ này không thu docker stats.

## Load theo từng mức VU

Mỗi mức giữ `constant-vus` trong 3 phút và lặp 3 lần khi lần chạy hoàn tất. Cột trung vị là median của các lần có số đo.

| VU | p95 (ms) | RPS | Error rate |
| ---: | ---: | ---: | ---: |
| 5 | 26.78 | 23.24 | 0.00% |
| 10 | 34.36 | 45.95 | 0.00% |
| 20 | 46.80 | 89.80 | 0.00% |
| 30 | 172.34 | 123.87 | 0.00% |
| 50 | 257.18 | 159.67 | 0.00% |

### Đọc bảng load

- p95 tăng nhanh ở bước 20 → 30: 3.68 lần so với mức liền trước.
- RPS bắt đầu chậm hơn VU từ mức 50: RPS tăng 1.29 lần trong khi số VU tăng 1.67 lần.
- Trong các mức VU đã đo, p95 trung vị vẫn dưới 500 ms và tỷ lệ lỗi trung vị dưới 1%.

### Từng lần load

| VU | Lần | Trạng thái | p95 | p99 | RPS | Error rate | Requests | CPU / RAM / DB |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | --- |
| 5 | 1 | PASS | 26.56 | 43.77 | 23.25 | 0.00% | 4206 | CPU avg 29.49% / max 42.30%; RAM dùng max 96.80%; Postgres max ai_service:1, analytics_service:7, content_service:2, user_service:5 |
| 5 | 2 | PASS | 26.78 | 42.04 | 23.24 | 0.00% | 4196 | CPU avg 30.77% / max 40.60%; RAM dùng max 97.60%; Postgres max ai_service:1, analytics_service:9, content_service:3, user_service:5 |
| 5 | 3 | PASS | 29.66 | 41.72 | 23.12 | 0.00% | 4176 | CPU avg 21.54% / max 31.70%; RAM dùng max 91.90%; Postgres max ai_service:1, analytics_service:10, content_service:3, user_service:5 |
| 10 | 1 | PASS | 32.56 | 59.19 | 46.31 | 0.00% | 8386 | CPU avg 23.98% / max 43.10%; RAM dùng max 92.60%; Postgres max ai_service:1, analytics_service:10, content_service:3, user_service:5 |
| 10 | 2 | PASS | 34.36 | 80.84 | 45.93 | 0.00% | 8311 | CPU avg 28.32% / max 45.30%; RAM dùng max 93.30%; Postgres max ai_service:1, analytics_service:10, content_service:3, user_service:5 |
| 10 | 3 | PASS | 35.21 | 54.80 | 45.95 | 0.00% | 8326 | CPU avg 27.87% / max 45.20%; RAM dùng max 91.90%; Postgres max ai_service:1, analytics_service:10, content_service:3, user_service:5 |
| 20 | 1 | PASS | 46.80 | 151.27 | 89.89 | 0.00% | 16271 | CPU avg 37.32% / max 48.50%; RAM dùng max 94.60%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:5 |
| 20 | 2 | PASS | 46.51 | 155.67 | 89.80 | 0.00% | 16261 | CPU avg 35.02% / max 50.50%; RAM dùng max 93.70%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:5 |
| 20 | 3 | PASS | 55.41 | 145.73 | 89.50 | 0.00% | 16216 | CPU avg 38.83% / max 57.20%; RAM dùng max 93.50%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:5 |
| 30 | 1 | PASS | 180.47 | 276.03 | 123.87 | 0.00% | 22436 | CPU avg 46.33% / max 80.00%; RAM dùng max 92.90%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:9 |
| 30 | 2 | PASS | 75.41 | 190.30 | 132.15 | 0.00% | 23936 | CPU avg 37.58% / max 50.00%; RAM dùng max 90.60%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:5 |
| 30 | 3 | PASS | 172.34 | 263.64 | 122.16 | 0.00% | 22136 | CPU avg 46.77% / max 60.40%; RAM dùng max 92.70%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:6 |
| 50 | 1 | PASS | 283.56 | 392.82 | 156.23 | 0.00% | 28401 | CPU avg 50.44% / max 60.40%; RAM dùng max 89.40%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:15 |
| 50 | 2 | PASS | 257.18 | 325.35 | 159.67 | 0.00% | 28926 | CPU avg 44.93% / max 54.40%; RAM dùng max 87.80%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:15 |
| 50 | 3 | PASS | 234.58 | 295.10 | 161.63 | 0.00% | 29316 | CPU avg 41.83% / max 44.60%; RAM dùng max 84.60%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:15 |

### p95 theo endpoint ở từng mức VU

| Endpoint | 5 VU | 10 VU | 20 VU | 30 VU | 50 VU |
| --- | ---: | ---: | ---: | ---: | ---: |
| GET /api/v1/analytics/dashboard | 29.89 | 38.53 | 58.09 | 184.16 | 273.32 |
| GET /api/v1/analytics/reviews/due | 27.57 | 34.61 | 50.03 | 161.51 | 244.65 |
| GET /api/v1/content/flashcards | 30.95 | 37.39 | 51.27 | 182.91 | 277.83 |
| GET /api/v1/users/me | 25.26 | 33.49 | 53.97 | 201.35 | 263.24 |
| GET /health | 2.02 | 1.93 | 1.73 | 2.53 | 4.11 |

## Capacity

Executor `constant-arrival-rate`, mỗi mức 3 phút, không `sleep`. Một iteration gọi đúng các GET của journey. Nếu danh sách bộ thẻ có phần tử thì thêm GET chi tiết, nên số request mục tiêu xấp xỉ `RATE × số GET mỗi vòng`.

| RATE (iter/s) | p95 (ms) | RPS thực tế | Error rate | Dropped iterations | Trạng thái |
| ---: | ---: | ---: | ---: | ---: | --- |
| 5 | 16.09 | 25.01 | 0.00% | 0 | PASS |
| 10 | 17.40 | 49.97 | 0.00% | 0 | PASS |
| 15 | 16.25 | 74.96 | 0.00% | 0 | PASS |
| 20 | 15.44 | 99.95 | 0.00% | 0 | PASS |

Mức RATE cao nhất còn đạt cả ba tiêu chí là 20 iteration/giây, tương ứng RPS thực tế 99.95.

## Smoke, stress, spike, soak

| Kịch bản | Cấu hình | Trạng thái | p95 | p99 | RPS | Error rate | Dropped | CPU / RAM / DB |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| smoke | `{"executor":"constant-vus","vus":1,"duration":"1m"}` | PASS | 18.84 | 29.35 | 4.72 | 0.00% | — | CPU avg 18.63% / max 25.40%; RAM dùng max 87.70%; Postgres max ai_service:1, analytics_service:3, content_service:1, user_service:2 |
| stress | `{"executor":"ramping-vus","levels_vu":[30,50,75,100],"hold":"3m","ramp":"20s"}` | FAIL | 10001.28 | 10016.93 | 80.79 | 5.07% | — | CPU avg 39.67% / max 69.20%; RAM dùng max 96.60%; Postgres max ai_service:1, analytics_service:10, content_service:10, user_service:15 |
| spike | `{"executor":"ramping-vus","pattern":"10 VU for 1m, 5s to 75 VU, hold 2m, 5s to 10 VU, hold 2m"}` | ERROR | — | — | — | 0.00% | — | CPU avg 18.33% / max 23.40%; RAM dùng max 92.50%; Postgres max ai_service:1, content_service:1, user_service:15 |
| spike | `{"executor":"ramping-vus","pattern":"10 VU for 1m, 5s to 75 VU, hold 2m, 5s to 10 VU, hold 2m"}` | PASS | 276.08 | 353.50 | 115.18 | 0.00% | — | CPU avg 38.13% / max 60.90%; RAM dùng max 96.40%; Postgres max ai_service:1, analytics_service:10, content_service:7, user_service:15 |
| soak | `{"executor":"constant-vus","vus":30,"duration":"30m"}` | ERROR | — | — | — | 0.00% | — | CPU avg 22.12% / max 30.20%; RAM dùng max 91.90%; Postgres max ai_service:1, content_service:1, user_service:15 |
| soak | `{"executor":"constant-vus","vus":30,"duration":"30m"}` | STOPPED | — | — | — | — | — | CPU avg 49.28% / max 76.00%; RAM dùng max 98.70%; Postgres max ai_service:1, analytics_service:10, content_service:7, user_service:13 |

## Chat end-to-end

API chat trả một JSON sau khi mô hình sinh xong (`disable_streaming=True`). `http_req_duration` của POST message là thời gian từ lúc gửi câu hỏi đến khi nhận đủ phản hồi. Time to first token không đo được vì không có luồng token.

| Trạng thái | Requests | p95 e2e (ms) | p95 HTTP (ms) | Error rate | Ghi chú |
| --- | ---: | ---: | ---: | ---: | --- |
| ERROR | — | — | — | 0.00% | k6 exited with code 100. |
| PASS | 6 | 4451.64 | 4011.83 | 0.00% | 3 câu hỏi, 1 VU |

## Thư mục kết quả

- `2026-11-03_09-56-29_smoke`: smoke, PASS
- `2026-11-03_09-57-40_load-vu5-r1`: load, PASS
- `2026-11-03_10-00-52_load-vu5-r2`: load, PASS
- `2026-11-03_10-04-04_load-vu5-r3`: load, PASS
- `2026-11-03_10-07-15_load-vu10-r1`: load, PASS
- `2026-11-03_10-10-27_load-vu10-r2`: load, PASS
- `2026-11-03_10-13-39_load-vu10-r3`: load, PASS
- `2026-11-03_10-16-51_load-vu20-r1`: load, PASS
- `2026-11-03_10-20-03_load-vu20-r2`: load, PASS
- `2026-11-03_10-23-15_load-vu20-r3`: load, PASS
- `2026-11-03_10-26-28_load-vu30-r1`: load, PASS
- `2026-11-03_10-29-40_load-vu30-r2`: load, PASS
- `2026-11-03_10-32-52_load-vu30-r3`: load, PASS
- `2026-11-03_10-36-04_load-vu50-r1`: load, PASS
- `2026-11-03_10-39-17_load-vu50-r2`: load, PASS
- `2026-11-03_10-42-29_load-vu50-r3`: load, PASS
- `2026-11-03_10-45-41_capacity-rate5`: capacity, PASS
- `2026-11-03_10-48-52_capacity-rate10`: capacity, PASS
- `2026-11-03_10-52-03_capacity-rate15`: capacity, PASS
- `2026-11-03_10-55-14_capacity-rate20`: capacity, PASS
- `2026-11-03_10-58-25_stress`: stress, FAIL
- `2026-11-03_11-11-49_spike`: spike, ERROR
- `2026-11-03_11-13-05_soak`: soak, ERROR
- `2026-11-03_11-14-16_chat`: chat, ERROR
- `2026-11-03_11-17-24_chat-retry`: chat, PASS
- `2026-11-03_11-17-34_soak-retry`: soak, STOPPED
- `2026-11-03_11-35-06_spike-retry`: spike, PASS
