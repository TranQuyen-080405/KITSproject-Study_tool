export function getWaitRemainingMs(nextReviewAt: string, now = Date.now()): number {
  const timestamp = new Date(nextReviewAt).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now) : Number.POSITIVE_INFINITY;
}

export function isReviewDue(nextReviewAt: string, now = Date.now()): boolean {
  return getWaitRemainingMs(nextReviewAt, now) === 0;
}

export function formatWaitRemaining(nextReviewAt: string, now = Date.now()): string {
  const ms = getWaitRemainingMs(nextReviewAt, now);
  if (!Number.isFinite(ms)) return "Chưa có lịch ôn";
  if (ms === 0) return "Đến lượt";

  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `Còn ${minutes} phút`;

  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 24) return `Còn ${hours} giờ`;

  const days = Math.ceil(ms / 86_400_000);
  return `Còn ${days} ngày`;
}
