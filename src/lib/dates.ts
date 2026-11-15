/**
 * Date helpers. All dates in this app are plain "YYYY-MM-DD" strings ("date keys")
 * so there is never any timezone confusion between browser, server and database.
 * The browser decides what "today" is (your local date) and tells the server.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_RE = /^(\d{4})-(\d{2})$/;

export function isValidDateKey(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function isValidMonthKey(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = MONTH_RE.exec(s);
  if (!m) return false;
  const mo = Number(m[2]);
  return mo >= 1 && mo <= 12;
}

export function isValidYear(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}$/.test(s);
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toKey(dt: Date): string {
  return dt.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const dt = fromKey(key);
  dt.setUTCDate(dt.getUTCDate() + n);
  return toKey(dt);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromKey(a).getTime() - fromKey(b).getTime()) / 86_400_000);
}

export function weekdayName(key: string): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    fromKey(key).getUTCDay()
  ];
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, "0")}` };
}

export function yearRange(year: string): { start: string; end: string } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * Latest date the server will accept as "today" from a client. The earliest timezone
 * on Earth is UTC+14, so anything beyond UTC now + 14h is certainly in the future.
 */
export function latestPossibleToday(): string {
  return toKey(new Date(Date.now() + 14 * 3_600_000));
}

/** Validates the client-supplied "today"; falls back to the server's UTC date. */
export function resolveToday(clientToday: string | null | undefined): string {
  const serverMax = latestPossibleToday();
  if (isValidDateKey(clientToday)) {
    const earliest = toKey(new Date(Date.now() - 12 * 3_600_000)); // UTC-12 is the last timezone
    if (clientToday <= serverMax && clientToday >= earliest) return clientToday;
  }
  return toKey(new Date());
}
