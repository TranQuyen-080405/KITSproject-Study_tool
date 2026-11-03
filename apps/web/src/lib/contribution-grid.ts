export type ContributionCell = {
  key: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
};

export type ContributionWeek = {
  monthLabel: string;
  cells: ContributionCell[];
};

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export function contributionLevel(count: number): ContributionCell["level"] {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

export function utcDayKey(date: Date): string {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${month}-${day}`;
}

export function buildContributionWeeks(
  activity: Record<string, number> | undefined,
  now = new Date(),
  weekCount = 53,
): ContributionWeek[] {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const cursor = new Date(end);
  cursor.setUTCDate(end.getUTCDate() - end.getUTCDay() - (weekCount - 1) * 7);

  const weeks: ContributionWeek[] = [];
  let previousMonth = -1;
  for (let week = 0; week < weekCount; week += 1) {
    const weekStart = new Date(cursor);
    const cells: ContributionCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const key = utcDayKey(cursor);
      const future = cursor.getTime() > end.getTime();
      const count = future ? 0 : (activity?.[key] ?? 0);
      cells.push({
        key,
        count,
        level: future ? 0 : contributionLevel(count),
        future,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const month = weekStart.getUTCMonth();
    weeks.push({
      monthLabel: month === previousMonth ? "" : MONTHS[month],
      cells,
    });
    previousMonth = month;
  }
  return weeks;
}
