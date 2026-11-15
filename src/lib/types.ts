import type { Stats as StreakStats } from "./streak";
import type { DayEntry } from "./rules";

export type Entry = DayEntry;
/** What /api/stats returns. `todayEntry` is today's log (or null) regardless of which month is on screen. */
export type Stats = StreakStats & { todayEntry: DayEntry | null };
