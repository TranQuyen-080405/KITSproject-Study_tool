# Số liệu slide — kiểm thử hiệu năng

Nguồn: các lần **PASS** ngày 2026-11-03, máy local, Gateway `http://localhost:3000`, k6 2.2.0. Chi tiết từng lần nằm ở `performance-tests/k6/KET_QUA_TONG_HOP.md`.

Các mức VU và RATE là cấu hình đã đo, không phải năng lực đã chứng nhận. Ngưỡng p95 500 ms và p99 1000 ms chỉ là mốc đánh giá GET.

Load lấy **median của 3 lần**. Mỗi vòng load là 5 GET rồi nghỉ 1 giây. Capacity không nghỉ.

## 1. Load — độ trễ và throughput theo số người dùng ảo

Mỗi mức giữ nguyên số VU trong 3 phút.

| VU | p95 (ms) | p99 (ms) | RPS | Tỷ lệ lỗi |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 26.78 | 42.04 | 23.24 | 0% |
| 10 | 34.36 | 59.19 | 45.95 | 0% |
| 20 | 46.80 | 151.27 | 89.80 | 0% |
| 30 | 172.34 | 263.64 | 123.87 | 0% |
| 50 | 257.18 | 325.35 | 159.67 | 0% |

Nhận xét:

- Từ 5 lên 20 VU, p95 tăng chậm (27 ms → 47 ms) và RPS gần như nhân đôi theo số VU (23 → 46 → 90).
- Bước 20 → 30 VU là chỗ p95 tăng mạnh nhất, khoảng 3.7 lần (47 ms → 172 ms), trong khi RPS chỉ tăng từ 90 lên 124.
- Từ 30 lên 50 VU, RPS tăng 1.29 lần trong khi số VU tăng 1.67 lần. Throughput vẫn tăng nhưng không còn theo kịp số người dùng ảo.
- Cả năm mức đều không có lỗi HTTP và p95 vẫn dưới 500 ms.

## 2. Load — p95 từng API (ms)

| API | 5 VU | 10 VU | 20 VU | 30 VU | 50 VU |
| --- | ---: | ---: | ---: | ---: | ---: |
| GET /health | 2.02 | 1.93 | 1.73 | 2.53 | 4.11 |
| GET /api/v1/users/me | 25.26 | 33.49 | 53.97 | 201.35 | 263.24 |
| GET /api/v1/content/flashcards | 30.95 | 37.39 | 51.27 | 182.91 | 277.83 |
| GET /api/v1/analytics/dashboard | 29.89 | 38.53 | 58.09 | 184.16 | 273.32 |
| GET /api/v1/analytics/reviews/due | 27.57 | 34.61 | 50.03 | 161.51 | 244.65 |

Nhận xét: Gateway health gần như không đổi. Bốn API có xác thực chậm cùng một nhịp khi VU tăng, nên độ trễ không nằm ở một endpoint riêng.

## 3. Capacity — throughput khi k6 đặt sẵn tốc độ

Không nghĩ 1 giây. Mỗi vòng vẫn là 5 GET, nên 10 vòng/giây tương ứng mục tiêu khoảng 50 request/giây.

| Vòng/giây | RPS đo được | p95 (ms) | Tỷ lệ lỗi | Iteration bị bỏ |
| ---: | ---: | ---: | ---: | ---: |
| 5 | 25.01 | 16.09 | 0% | 0 |
| 10 | 49.97 | 17.40 | 0% | 0 |
| 15 | 74.96 | 16.25 | 0% | 0 |
| 20 | 99.95 | 15.44 | 0% | 0 |

Nhận xét: Trong bốn mức đã đặt, hệ thống theo kịp tốc độ mục tiêu. p95 giữ quanh 15–17 ms. Mức cao nhất còn đạt p95 dưới 500 ms, lỗi dưới 1% và không bỏ iteration là **20 vòng/giây, khoảng 100 request/giây**. Chưa chạy mức cao hơn.

## 4. Các kịch bản đạt khác

| Kịch bản | Cách chạy | p95 (ms) | p99 (ms) | RPS | Tỷ lệ lỗi |
| --- | --- | ---: | ---: | ---: | ---: |
| Smoke | 1 VU trong 1 phút | 18.84 | 29.35 | 4.72 | 0% |
| Spike | 10 VU (1 phút) → 75 VU (2 phút) → 10 VU (2 phút) | 276.08 | 353.50 | 115.18 | 0% |
| Chat | 1 VU, 3 câu hỏi, đo đến khi nhận đủ câu trả lời | 4451.64 | 4686.21 | — | 0% |

Nhận xét:

- Smoke xác nhận luồng GET chạy đúng trước khi tăng tải. p95 19 ms.
- Spike là một số cho cả pha nền, pha nhảy lên 75 VU và pha hạ về 10 VU. p95 276 ms, không lỗi. Không đọc số này thành p95 của riêng mức 75 VU.
- Chat không dùng chung ngưỡng 500 ms của GET. Median 1813 ms, p95 4452 ms, chỉ có 3 câu. API trả một JSON sau khi mô hình sinh xong, nên không có time to first token.

## Ghi chú khi đặt lên slide

- Số load và capacity ở trên là kết quả đạt. Stress tới 100 VU và soak 30 phút không hoàn tất trong điều kiện máy local, nên không đưa vào các bảng này.
- Máy đo đã dùng khoảng 85–97% RAM. Số liệu mô tả môi trường local của lần chạy, không phải trần production.
