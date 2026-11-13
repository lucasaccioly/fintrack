/** `@db.Date` columns: store/read as UTC midnight so "YYYY-MM-DD" never shifts by timezone. */
export const toDbDate = (ymd: string) => new Date(`${ymd}T00:00:00.000Z`);
export const fromDbDate = (d: Date) => d.toISOString().slice(0, 10);

/** "YYYY-MM" -> [first day, first day of next month) as a Prisma date filter. */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

export function addMonths(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export const currentMonth = () => new Date().toISOString().slice(0, 7);
