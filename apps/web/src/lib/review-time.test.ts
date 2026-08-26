import { describe, expect, it } from "vitest";
import { formatWaitRemaining, getWaitRemainingMs, isReviewDue } from "./review-time";

describe("formatWaitRemaining", () => {
  const now = Date.parse("2026-08-26T10:00:00.000Z");

  it("shows due label when next review is in the past", () => {
    expect(formatWaitRemaining("2026-08-26T09:00:00.000Z", now)).toBe("Đến hạn");
    expect(isReviewDue("2026-08-26T09:00:00.000Z", now)).toBe(true);
    expect(getWaitRemainingMs("2026-08-26T09:00:00.000Z", now)).toBe(0);
  });

  it("formats minutes hours and days", () => {
    expect(formatWaitRemaining("2026-08-26T10:30:00.000Z", now)).toBe("Còn 30 phút");
    expect(formatWaitRemaining("2026-08-26T14:00:00.000Z", now)).toBe("Còn 4 giờ");
    expect(formatWaitRemaining("2026-08-28T10:00:00.000Z", now)).toBe("Còn 2 ngày");
  });
});
