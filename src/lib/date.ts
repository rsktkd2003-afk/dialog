/** アプリの基準タイムゾーン。現状は日本国内での利用を前提とする。 */
export const APP_TIME_ZONE = "Asia/Tokyo";

export function todayString(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: APP_TIME_ZONE }).format(now);
}

export function isValidDateString(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(date + "T00:00:00Z").getUTCDay();
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
export const WEEKDAY_LABELS = WEEKDAYS;

export function formatDateJp(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}月${Number(d)}日（${WEEKDAYS[weekday(date)]}）`;
}

export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
