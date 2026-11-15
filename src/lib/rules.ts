/**
 * The meditation rules live here (shared by server and browser) so they are easy to change.
 *
 * - A day has two sessions: morning and evening.
 * - A session "counts" (shows green) only if it is at least MIN_SESSION_MINUTES long.
 * - A day with both sessions counting = full green; one session = half green; none = red (missed).
 * - Streak rule: a day keeps your streak alive if AT LEAST ONE session counts (see dayCounts).
 */
export const MIN_SESSION_MINUTES = 15;

export type Sessions = { morningMinutes: number | null; eveningMinutes: number | null };
export type DayEntry = Sessions & { date: string; note: string };

export const sessionCounts = (minutes: number | null | undefined): boolean =>
  typeof minutes === "number" && minutes >= MIN_SESSION_MINUTES;

/** 0 = nothing counts, 1 = one session counts (half), 2 = both count (full). */
export function dayLevel(e: Sessions | null | undefined): 0 | 1 | 2 {
  if (!e) return 0;
  return ((sessionCounts(e.morningMinutes) ? 1 : 0) + (sessionCounts(e.eveningMinutes) ? 1 : 0)) as 0 | 1 | 2;
}

/** Whether this day keeps the streak going. Change to `dayLevel(e) === 2` to require both sessions. */
export const dayCounts = (e: Sessions | null | undefined): boolean => dayLevel(e) >= 1;

type RawEntry = {
  date: string;
  morningMinutes?: number | null;
  eveningMinutes?: number | null;
  /** Old single-session field from the first version of the app. */
  minutes?: number | null;
  note?: string | null;
};

/**
 * Turns a database document into a DayEntry. Entries saved by the first version of the app
 * (one "minutes" value, no morning/evening) are read as a morning session so your existing
 * streak is preserved; if they had no minutes they are treated as exactly the minimum.
 */
export function normalizeEntry(raw: RawEntry): DayEntry {
  const isLegacy = raw.morningMinutes === undefined && raw.eveningMinutes === undefined;
  return {
    date: raw.date,
    morningMinutes: isLegacy ? (raw.minutes ?? MIN_SESSION_MINUTES) : (raw.morningMinutes ?? null),
    eveningMinutes: isLegacy ? null : (raw.eveningMinutes ?? null),
    note: raw.note ?? "",
  };
}
