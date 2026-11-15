"use client";

import type { Stats } from "@/lib/types";
import { MIN_SESSION_MINUTES, dayLevel, sessionCounts } from "@/lib/rules";

function message(s: Stats): { text: string; tone: "gold" | "green" | "amber" | "plain" } {
  if (s.doneToday && s.recordStatus === "new")
    return { tone: "gold", text: `New personal record! ${s.currentStreak} days, beating your previous best of ${s.previousBest}.` };
  if (s.doneToday && s.recordStatus === "tied")
    return { tone: "gold", text: `You've matched your best streak of ${s.previousBest} days. One more day sets a new record.` };
  if (s.doneToday)
    return { tone: "green", text: s.currentStreak === 1 ? "Day one is done. This is how every streak starts." : `${s.currentStreak} days in a row. Beautiful consistency.` };
  if (s.streakAtRisk) {
    const toBeat = s.longestStreak - s.currentStreak + 1;
    return { tone: "amber", text: `Your ${s.currentStreak}-day streak is alive. Meditate today to keep it going (${toBeat} more day${toBeat === 1 ? "" : "s"} to beat your record).` };
  }
  if (s.lastBrokenStreak > 0)
    return { tone: "plain", text: `Your ${s.lastBrokenStreak}-day streak has ended. A new one can start today.` };
  return { tone: "plain", text: "Start your first streak today." };
}

export default function StreakPanel({ stats, onOpenToday }: { stats: Stats | null; onOpenToday: () => void }) {
  if (!stats) return <section className="card streak skeleton" aria-busy="true" />;
  const msg = message(stats);
  const t = stats.todayEntry;
  const amDone = sessionCounts(t?.morningMinutes);
  const pmDone = sessionCounts(t?.eveningMinutes);
  const level = dayLevel(t);

  return (
    <section className={`card streak tone-${msg.tone}`}>
      <div className="streak-main">
        <div className="streak-number" aria-label={`Current streak ${stats.currentStreak} days`}>
          <span className="big">{stats.currentStreak}</span>
          <span className="unit">day streak</span>
        </div>
        <p className="streak-msg">{msg.text}</p>
        <div className="today-chips" aria-label="Today's sessions">
          <span className={`chip ${amDone ? "on" : ""}`}>☀ Morning {amDone ? "✓" : ""}</span>
          <span className={`chip ${pmDone ? "on" : ""}`}>☾ Evening {pmDone ? "✓" : ""}</span>
        </div>
        <button className={`btn ${level === 2 ? "ghost" : "primary"}`} onClick={onOpenToday}>
          {level === 2 ? "Edit today's sessions" : level === 1 ? "Log the other session" : "Log today's meditation"}
        </button>
      </div>
      <dl className="stats">
        <div><dt>Longest streak</dt><dd>{stats.longestStreak}<small> days</small></dd></div>
        <div><dt>Full days (both)</dt><dd>{stats.fullDays}</dd></div>
        <div><dt>Days meditated</dt><dd>{stats.totalDays}</dd></div>
        <div><dt>Since</dt><dd className="small-dd">{stats.firstDate ?? "-"}</dd></div>
      </dl>
      <p className="rule-note">Each session counts at {MIN_SESSION_MINUTES}+ minutes. One session keeps your streak alive; both make the day fully green.</p>
    </section>
  );
}
