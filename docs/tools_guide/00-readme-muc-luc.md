# Mục lục — Hướng dẫn công cụ trong dự án

Tài liệu này dành cho người mới: giải thích từng công cụ / loại file trong repo `korean-learning-app` bằng ngôn ngữ dễ hiểu.

## Thứ tự đọc gợi ý

1. [01-monorepo.md](./01-monorepo.md) — bản đồ thư mục
2. [02-microservices.md](./02-microservices.md) — các service tách nhau thế nào
3. [03-nodejs.md](./03-nodejs.md) → [04-pnpm-va-workspace.md](./04-pnpm-va-workspace.md) → [05-package-json.md](./05-package-json.md)
4. [06-typescript.md](./06-typescript.md) → [07-tsx.md](./07-tsx.md) → [08-vitest.md](./08-vitest.md)
5. [09-express.md](./09-express.md) → [10-cau-truc-mot-service.md](./10-cau-truc-mot-service.md)
6. [11-prisma.md](./11-prisma.md) → [12-postgresql.md](./12-postgresql.md) → [13-rabbitmq.md](./13-rabbitmq.md)
7. [14-react.md](./14-react.md) → [15-vite.md](./15-vite.md) → [16-react-native-va-expo.md](./16-react-native-va-expo.md)
8. [17-docker-va-compose.md](./17-docker-va-compose.md) → [18-dockerfile.md](./18-dockerfile.md) → [19-env-va-gitignore.md](./19-env-va-gitignore.md)
9. [20-yaml.md](./20-yaml.md) → [21-markdown-va-docs.md](./21-markdown-va-docs.md) → [22-cursor-rules.md](./22-cursor-rules.md) → [23-shared-packages.md](./23-shared-packages.md)

## Danh sách đầy đủ (24 file)

| File | Chủ đề |
| --- | --- |
| `00-readme-muc-luc.md` | Mục lục (file này) |
| `01-monorepo.md` | Một repo chứa nhiều app |
| `02-microservices.md` | Kiến trúc nhiều service |
| `03-nodejs.md` | Runtime chạy backend |
| `04-pnpm-va-workspace.md` | Cài package & monorepo |
| `05-package-json.md` | “Giấy tờ tùy thân” của mỗi package |
| `06-typescript.md` | Ngôn ngữ chính của project |
| `07-tsx.md` | Chạy file `.ts` khi phát triển |
| `08-vitest.md` | Chạy test |
| `09-express.md` | Framework HTTP backend |
| `10-cau-truc-mot-service.md` | routes / controllers / services… |
| `11-prisma.md` | ORM & schema database |
| `12-postgresql.md` | Cơ sở dữ liệu |
| `13-rabbitmq.md` | Hàng đợi sự kiện (sắp dùng) |
| `14-react.md` | UI web |
| `15-vite.md` | Dev server web |
| `16-react-native-va-expo.md` | UI mobile |
| `17-docker-va-compose.md` | Chạy nhiều container cùng lúc |
| `18-dockerfile.md` | Công thức đóng gói app |
| `19-env-va-gitignore.md` | Bí mật cấu hình & file không commit |
| `20-yaml.md` | Định dạng file cấu hình |
| `21-markdown-va-docs.md` | File tài liệu `.md` |
| `22-cursor-rules.md` | Rule cho AI trong Cursor |
| `23-shared-packages.md` | Code dùng chung tối thiểu |

## 1. Đây là gì?

Đây là “mục lục sách hướng dẫn”: giúp bạn biết đọc file nào trước khi đi sâu từng công cụ.

## 2. Vai trò trong dự án

Repo đang ở giai đoạn skeleton. Nhiều thư mục/file chưa có logic thật — tài liệu này giúp bạn không bị lạc khi mở cấu trúc thư mục.

## 3. Cách thức hoạt động

Bạn mở từng file `.md` theo thứ tự gợi ý. Mỗi file giải thích một khái niệm theo cùng 5 mục: Đây là gì → Vai trò → Cách hoạt động → Lệnh → Ví dụ trong source.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

Không có lệnh riêng cho mục lục. Chỉ cần mở file trong editor hoặc xem trên GitHub/Cursor.

## 5. Ví dụ thực tế từ Source Code

Thư mục chứa toàn bộ guide:

```text
docs/tools_guide/
├── 00-readme-muc-luc.md
├── 01-monorepo.md
└── ...
```
