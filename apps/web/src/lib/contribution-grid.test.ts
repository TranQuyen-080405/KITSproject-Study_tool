import { describe, expect, it } from "vitest";
import { buildContributionWeeks, contributionLevel } from "./contribution-grid";

describe("contribution heatmap", () => {
  it("maps study counts onto five shades", () => {
    expect(contributionLevel(0)).toBe(0);
    expect(contributionLevel(1)).toBe(1);
    expect(contributionLevel(3)).toBe(2);
    expect(contributionLevel(6)).toBe(3);
    expect(contributionLevel(7)).toBe(4);
  });

  it("builds Sunday weeks and keeps days after today empty", () => {
    const now = new Date("2026-11-03T12:00:00.000Z");
    const weeks = buildContributionWeeks({ "2026-11-03": 2, "2026-11-02": 1 }, now, 2);
    expect(weeks).toHaveLength(2);
    expect(weeks[0].cells).toHaveLength(7);
    const today = weeks.flatMap((week) => week.cells).find((cell) => cell.key === "2026-11-03");
    const tomorrow = weeks.flatMap((week) => week.cells).find((cell) => cell.key === "2026-11-04");
    expect(today).toMatchObject({ count: 2, level: 2, future: false });
    expect(tomorrow).toMatchObject({ count: 0, future: true });
    expect(new Date(`${weeks[0].cells[0].key}T00:00:00.000Z`).getUTCDay()).toBe(0);
  });
});