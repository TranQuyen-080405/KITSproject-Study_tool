# YAML (.yml / .yaml)

## 1. Đây là gì?

YAML là định dạng **cấu hình dễ đọc**: dùng thụt đầu dòng thay vì nhiều dấu ngoặc như JSON. Hay gặp trong Docker Compose, CI, và khai báo workspace.

## 2. Vai trò trong dự án

Hai file YAML quan trọng:

- `pnpm-workspace.yaml` — monorepo gồm package nào  
- `docker-compose.yml` — topology container local  

## 3. Cách thức hoạt động

Công cụ đọc YAML → thành object cấu hình trong bộ nhớ. Lỗi thụt lề hoặc dấu `:` sai sẽ làm parse fail — cần giữ indent nhất quán (thường 2 spaces).

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

Không “chạy” YAML trực tiếp; công cụ đọc nó:

```bash
docker compose config   # kiểm tra compose hợp lệ (khi có Docker)
```

Cú pháp:

```yaml
key: value
list:
  - item1
  - item2
nested:
  child: true
```

## 5. Ví dụ thực tế từ Source Code

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml):

```yaml
packages:
  - "apps/*"
  - "packages/*"
```
