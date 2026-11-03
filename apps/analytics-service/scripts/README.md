# Script Analytics

## Ví dụ lịch ôn SM-2

`schedule-review-examples.ts` gọi `scheduleReview` với ba chuỗi đã dùng trong báo cáo:

- Nhánh thuộc: `사과`, bốn lần đúng.
- Nhánh không thuộc: `레몬`, sai rồi học lại.
- Nhánh người học thật: `바나나`, đúng, quên đúng hạn, rồi thuộc.

Mỗi bước chỉ nhập ngày giờ `dd/MM/yyyy HH:mm`, kết quả `đúng` hoặc `sai`, và số giây. Script không ghi database. `n`, khoảng ôn, `easeFactor`, trạng thái và lần ôn kế chỉ có trong file kết quả, do `scheduleReview` tính ra.

File kết quả: `scripts/output/schedule-review-examples.json`. Giờ trong file là UTC+7.

Từ thư mục gốc repo:

```powershell
corepack pnpm --filter @korean-learning/analytics-service exec tsx scripts/schedule-review-examples.ts
```

Hoặc từ `apps/analytics-service`:

```powershell
corepack pnpm exec tsx scripts/schedule-review-examples.ts
```
