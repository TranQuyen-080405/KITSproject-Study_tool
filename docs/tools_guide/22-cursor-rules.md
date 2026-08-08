# Cursor Rules (.cursor/rules)

## 1. Đây là gì?

Cursor Rules là file hướng dẫn cho **AI trong Cursor** (Agent/Chat): quy ước code, phong cách, điều nên/không nên làm trong repo này. File thường là `.mdc` trong `.cursor/rules/`.

## 2. Vai trò trong dự án

Repo có [`lazycode.mdc`](../../.cursor/rules/lazycode.mdc) với `alwaysApply: true` — mọi chat trong project nên ưu tiên giải pháp đơn giản nhất vẫn đúng (YAGNI, ít abstraction, ít dependency mới).

## 3. Cách thức hoạt động

Cursor đọc frontmatter YAML đầu file:

- `description` — mô tả ngắn  
- `alwaysApply: true` — luôn gắn vào context  
- (hoặc `globs`) — chỉ khi làm việc với file khớp pattern  

Phần thân file là nội dung rule bằng Markdown.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

Không có CLI riêng. Form chuẩn:

```md
---
description: Mô tả rule
alwaysApply: true
---

# Tiêu đề rule
Nội dung...
```

## 5. Ví dụ thực tế từ Source Code

[`.cursor/rules/lazycode.mdc`](../../.cursor/rules/lazycode.mdc):

```md
---
description: Ponytail, lazy senior dev mode. Always pick the simplest solution that works.
alwaysApply: true
---

# Ponytail, lazy senior dev mode
...
```
