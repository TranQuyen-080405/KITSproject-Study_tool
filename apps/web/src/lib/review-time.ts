export function getWaitRemainingMs(nextReviewAt: string, now = Date.now()): number {
  return Math.max(0, new Date(nextReviewAt).getTime() - now);
}

export function isReviewDue(nextReviewAt: string, now = Date.now()): boolean {
  return getWaitRemainingMs(nextReviewAt, now) === 0;
}

export function formatWaitRemaining(nextReviewAt: string, now = Date.now()): string {
  const ms = getWaitRemainingMs(nextReviewAt, now);
  if (ms === 0) return "Đến hạn";

  const minutes = Math.ceil(ms / 60_000);
  if (minutes < 60) return `Còn ${minutes} phút`;

  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 24) return `Còn ${hours} giờ`;

  const days = Math.ceil(ms / 86_400_000);
  return `Còn ${days} ngày`;
}
