import assert from "node:assert/strict";
import { computeStats } from "../src/lib/streak";
import { buildReport, toCsv } from "../src/lib/report";

const t = (name: string, fn: () => void) => { fn(); console.log("ok -", name); };

t("empty", () => {
  const s = computeStats([], "2026-11-10");
  assert.equal(s.currentStreak, 0); assert.equal(s.longestStreak, 0); assert.equal(s.recordStatus, null);
});
t("streak alive through today", () => {
  const s = computeStats(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10");
  assert.equal(s.currentStreak, 3); assert.equal(s.doneToday, true); assert.equal(s.streakAtRisk, false);
});
t("streak alive but today not yet logged", () => {
  const s = computeStats(["2026-11-08", "2026-11-09"], "2026-11-10");
  assert.equal(s.currentStreak, 2); assert.equal(s.streakAtRisk, true); assert.equal(s.doneToday, false);
});
t("streak broken after missing a full day", () => {
  const s = computeStats(["2026-11-05", "2026-11-06", "2026-11-07"], "2026-11-10");
  assert.equal(s.currentStreak, 0); assert.equal(s.longestStreak, 3); assert.equal(s.lastBrokenStreak, 3);
});
t("backfilling yesterday joins streaks", () => {
  const before = computeStats(["2026-11-07", "2026-11-08", "2026-11-10"], "2026-11-10");
  assert.equal(before.currentStreak, 1);
  const after = computeStats(["2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10");
  assert.equal(after.currentStreak, 4);
});
t("new record vs previous best", () => {
  const dates = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-11-07", "2026-11-08", "2026-11-09", "2026-11-10"];
  const s = computeStats(dates, "2026-11-10");
  assert.equal(s.previousBest, 3); assert.equal(s.currentStreak, 4); assert.equal(s.recordStatus, "new");
  const tied = computeStats(dates.slice(0, 6), "2026-11-09");
  assert.equal(tied.recordStatus, "tied");
});
t("works across month/year boundary", () => {
  const s = computeStats(["2025-12-30", "2025-12-31", "2026-01-01"], "2026-01-01");
  assert.equal(s.currentStreak, 3);
});
import { MIN_SESSION_MINUTES, dayCounts, dayLevel, normalizeEntry, type DayEntry } from "../src/lib/rules";

const day = (date: string, morningMinutes: number | null, eveningMinutes: number | null, note = ""): DayEntry =>
  ({ date, morningMinutes, eveningMinutes, note });

t("15-minute minimum per session", () => {
  assert.equal(MIN_SESSION_MINUTES, 15);
  assert.equal(dayLevel(day("d", 15, 15)), 2);
  assert.equal(dayLevel(day("d", 14, 15)), 1);
  assert.equal(dayLevel(day("d", 20, null)), 1);
  assert.equal(dayLevel(day("d", 10, 5)), 0);
  assert.equal(dayLevel(day("d", null, null)), 0);
  assert.equal(dayCounts(day("d", null, 30)), true);
  assert.equal(dayCounts(day("d", 14, null)), false);
});
t("legacy v1 entries are read as a morning session", () => {
  assert.deepEqual(normalizeEntry({ date: "d", minutes: 20, note: "x" }), day("d", 20, null, "x"));
  assert.equal(normalizeEntry({ date: "d", minutes: null }).morningMinutes, 15);
  assert.equal(normalizeEntry({ date: "d", morningMinutes: null, eveningMinutes: 25 }).eveningMinutes, 25);
});
t("report: full / half / missed / pending, streak across months, CSV safety", () => {
  const entries = [
    day("2026-10-31", 20, 20), day("2026-11-01", 15, null), day("2026-11-02", null, 30, "=evil"),
    day("2026-11-04", 10, 10, 'felt "calm"'), // under 15 -> doesn't count
    day("2026-11-06", 15, 15),
  ];
  const r = buildReport({ title: "x", start: "2026-11-01", end: "2026-11-30", today: "2026-11-07",
    firstDate: "2026-10-31", allEntries: entries });
  const st = r.rows.map((x) => x.status);
  assert.deepEqual(st, ["Morning only", "Evening only", "Missed", "Missed", "Missed", "Both sessions", "Pending (today)"]);
  assert.equal(r.rows[0].streak, 2); // Oct 31 + Nov 1
  assert.equal(r.rows[1].streak, 3);
  assert.equal(r.rows[3].totalMinutes, 20); // minutes still recorded although day is missed
  assert.equal(r.summary.find((x) => x.label.startsWith("Missed"))!.value, 3);
  const csv = toCsv(r);
  assert.ok(csv.includes("'=evil") && csv.includes('"felt ""calm"""'));
});
