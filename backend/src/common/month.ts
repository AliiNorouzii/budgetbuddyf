/** Month helpers. Months are `YYYY-MM` strings in UTC. */

export function currentMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7);
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** The `count` months ending with `month`, oldest first. */
export function previousMonths(month: string, count: number): string[] {
  const [y, m] = month.split('-').map(Number);
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - count + i, 1)).toISOString().slice(0, 7),
  );
}
