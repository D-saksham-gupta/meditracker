"use client";

import type { Entry } from "@/lib/types";
import { MONTH_NAMES, monthGrid, monthLabel, monthOf } from "@/lib/clientDates";
import { MIN_SESSION_MINUTES, dayLevel, sessionCounts } from "@/lib/rules";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  month: string;
  today: string;
  entries: Entry[];
  firstDate: string | null;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (month: string) => void;
  onToday: () => void;
  onSelect: (date: string) => void;
};

export default function Calendar({ month, today, entries, firstDate, loading, onPrev, onNext, onJump, onToday, onSelect }: Props) {
  const done = new Map(entries.map((e) => [e.date, e]));
  const cells = monthGrid(month);
  const currentMonth = monthOf(today);
  const isCurrent = month === currentMonth;

  const lastTracked = month === currentMonth ? today : month < currentMonth ? `${month}-31` : "";
  let fullCount = 0, halfCount = 0, missedCount = 0;
  for (const c of cells) {
    if (!c || c > lastTracked) continue;
    const level = dayLevel(done.get(c));
    if (level === 2) fullCount++;
    else if (level === 1) halfCount++;
    else if (firstDate && c >= firstDate && c !== today) missedCount++; // today isn't "missed" until the day is over
  }

  const [y, m] = month.split("-").map(Number);
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: thisYear - 2019 }, (_, i) => thisYear - i);

  return (
    <section className="card cal" aria-label="Meditation calendar">
      <div className="cal-head">
        <button className="icon-btn" onClick={onPrev} aria-label="Previous month">‹</button>
        <div className="cal-title">
          <h2>{monthLabel(month)}</h2>
          <div className="pickers">
            <select
              aria-label="Month"
              value={m}
              onChange={(e) => onJump(`${y}-${String(e.target.value).padStart(2, "0")}`)}
            >
              {MONTH_NAMES.map((n, i) => (
                <option key={n} value={i + 1} disabled={`${y}-${String(i + 1).padStart(2, "0")}` > currentMonth}>{n}</option>
              ))}
            </select>
            <select
              aria-label="Year"
              value={y}
              onChange={(e) => {
                const target = `${e.target.value}-${String(m).padStart(2, "0")}`;
                onJump(target > currentMonth ? currentMonth : target);
              }}
            >
              {years.map((yr) => <option key={yr} value={yr}>{yr}</option>)}
            </select>
            {!isCurrent && <button className="btn tiny" onClick={onToday}>Today</button>}
          </div>
        </div>
        <button className="icon-btn" onClick={onNext} disabled={isCurrent} aria-label="Next month">›</button>
      </div>

      <div className={`grid ${loading ? "is-loading" : ""}`} role="grid">
        {WEEKDAYS.map((w) => <div key={w} className="dow" role="columnheader">{w}</div>)}
        {cells.map((c, i) => {
          if (!c) return <div key={`p${i}`} className="cell pad" />;
          const entry = done.get(c);
          const level = dayLevel(entry);
          const future = c > today;
          const isToday = c === today;
          const missed = level === 0 && !future && !isToday && !!firstDate && c >= firstDate;
          const am = sessionCounts(entry?.morningMinutes);
          const state =
            level === 2 ? "full"
            : level === 1 ? (am ? "half half-am" : "half half-pm")
            : future ? "future" : isToday ? "today" : missed ? "missed" : "untracked";
          const detail = entry
            ? [
                entry.morningMinutes != null ? `morning ${entry.morningMinutes} min` : null,
                entry.eveningMinutes != null ? `evening ${entry.eveningMinutes} min` : null,
              ].filter(Boolean).join(", ")
            : "";
          const status =
            level === 2 ? "both sessions done"
            : level === 1 ? `${am ? "morning" : "evening"} session only`
            : missed ? "missed" : isToday ? "today, not logged yet" : "";
          const label = `${c}: ${status}${detail ? ` (${detail})` : ""}`.replace(/: $/, "");
          return (
            <button
              key={c}
              role="gridcell"
              className={`cell ${state} ${isToday ? "is-today" : ""}`}
              disabled={future}
              onClick={() => onSelect(c)}
              aria-label={label}
              title={status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}${detail ? ` · ${detail}` : ""}${missed ? " - tap to add" : ""}` : ""}
            >
              <span className="num">{Number(c.slice(8))}</span>
              {level > 0 && <span className="mark" aria-hidden>✓</span>}
              {missed && <span className="mark" aria-hidden>×</span>}
            </button>
          );
        })}
      </div>

      <div className="cal-foot">
        <p className="summary">
          <strong>{fullCount}</strong> full · <strong>{halfCount}</strong> half · <strong>{missedCount}</strong> missed
        </p>
        <ul className="legend" aria-label="Legend">
          <li><i className="sw full" /> Both sessions</li>
          <li><i className="sw half" /> One session (top = morning, bottom = evening)</li>
          <li><i className="sw missed" /> Missed</li>
          <li><i className="sw today" /> Today</li>
        </ul>
        <p className="rule-note">A session counts at {MIN_SESSION_MINUTES}+ minutes.</p>
      </div>
    </section>
  );
}
