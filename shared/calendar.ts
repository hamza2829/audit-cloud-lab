export interface CalendarDay {
  date: string; // YYYY-MM-DD
  inMonth: boolean;
}

/** Monday-first month grid, always full weeks. month is 1..12. */
export function monthGrid(year: number, month: number): CalendarDay[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (first.getUTCDay() + 6) % 7; // Monday = 0
  const start = new Date(first);
  start.setUTCDate(1 - offset);
  const weeks: CalendarDay[][] = [];
  const cursor = new Date(start);
  do {
    const week: CalendarDay[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({ date: cursor.toISOString().slice(0, 10), inMonth: cursor.getUTCMonth() === month - 1 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === month - 1);
  return weeks;
}

export function groupByDate<T extends { plannedDate: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.plannedDate) ?? [];
    list.push(item);
    map.set(item.plannedDate, list);
  }
  return map;
}
