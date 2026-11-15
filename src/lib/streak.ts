import { addDays, diffDays } from "./dates";

export type Stats = {
  today: string;
  doneToday: boolean;
  /** Consecutive days ending today (or yesterday, if today isn't logged yet). */
  currentStreak: number;
  /** True while the streak is alive but today still needs logging. */
  streakAtRisk: boolean;
  longestStreak: number;
  /** Best streak before the current one began (0 if none). */
  previousBest: number;
  /** "new" = current streak beat your previous best; "tied" = equals it. */
  recordStatus: "new" | "tied" | null;
  /** Days where at least one session counted. */
  totalDays: number;
  /** Days where both sessions counted. */
  fullDays: number;
  firstDate: string | null;
  /** Length of the streak that ended most recently if it is now broken (0 otherwise). */
  lastBrokenStreak: number;
};

type Run = { start: string; end: string; length: number };

export function buildRuns(sortedUniqueDates: string[]): Run[] {
  const runs: Run[] = [];
  for (const d of sortedUniqueDates) {
    const last = runs[runs.length - 1];
    if (last && diffDays(d, last.end) === 1) {
      last.end = d;
      last.length += 1;
    } else {
      runs.push({ start: d, end: d, length: 1 });
    }
  }
  return runs;
}

export function computeStats(dates: string[], today: string, fullDays = 0): Stats {
  const sorted = [...new Set(dates)].filter((d) => d <= today).sort();
  const runs = buildRuns(sorted);
  const last = runs[runs.length - 1];

  const doneToday = !!last && last.end === today;
  const alive = !!last && (last.end === today || last.end === addDays(today, -1));
  const currentRun = alive ? last : undefined;
  const currentStreak = currentRun ? currentRun.length : 0;

  const others = currentRun ? runs.slice(0, -1) : runs;
  const previousBest = others.reduce((m, r) => Math.max(m, r.length), 0);
  const longestStreak = Math.max(previousBest, currentStreak);

  let recordStatus: Stats["recordStatus"] = null;
  if (currentStreak > 0 && previousBest > 0) {
    if (currentStreak > previousBest) recordStatus = "new";
    else if (currentStreak === previousBest) recordStatus = "tied";
  }

  return {
    today,
    doneToday,
    currentStreak,
    streakAtRisk: alive && !doneToday,
    longestStreak,
    previousBest,
    recordStatus,
    totalDays: sorted.length,
    fullDays,
    firstDate: sorted[0] ?? null,
    lastBrokenStreak: !alive && last ? last.length : 0,
  };
}

/** Map of date -> length of the streak ending on that date (only for logged dates). */
export function runningStreaks(sortedUniqueDates: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const run of buildRuns(sortedUniqueDates)) {
    let d = run.start;
    for (let i = 1; i <= run.length; i++, d = addDays(d, 1)) map.set(d, i);
  }
  return map;
}
