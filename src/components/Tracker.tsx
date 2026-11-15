"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry, Stats } from "@/lib/types";
import { localToday, monthOf, shiftMonth } from "@/lib/clientDates";
import StreakPanel from "./StreakPanel";
import Calendar from "./Calendar";
import DayModal from "./DayModal";
import ExportPanel from "./ExportPanel";

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export default function Tracker() {
  const [today, setToday] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // "Today" is decided by the browser so it always matches your own timezone.
  useEffect(() => {
    const t = localToday();
    setToday(t);
    setMonth(monthOf(t));
  }, []);

  const refresh = useCallback(async () => {
    if (!today || !month) return;
    try {
      const [e, s] = await Promise.all([
        fetch(`/api/entries?month=${month}`, { cache: "no-store" }).then((r) => json<{ entries: Entry[] }>(r)),
        fetch(`/api/stats?today=${today}`, { cache: "no-store" }).then((r) => json<Stats>(r)),
      ]);
      setEntries(e.entries);
      setStats(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [today, month]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  async function save(date: string, morningMinutes: number | null, eveningMinutes: number | null, note: string) {
    await json(
      await fetch(`/api/entries/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ morningMinutes, eveningMinutes, note }),
      })
    );
    await refresh();
  }

  async function remove(date: string) {
    await json(await fetch(`/api/entries/${date}`, { method: "DELETE" }));
    await refresh();
  }

  if (!today || !month) return <main className="shell" />;

  // Today's log comes from stats so it's right even while browsing another month.
  const selectedEntry = selected
    ? entries.find((e) => e.date === selected) ?? (selected === today ? stats?.todayEntry ?? null : null)
    : null;

  return (
    <main className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">Daily practice</p>
          <h1>Stillness</h1>
        </div>
      </header>

      {error && (
        <div className="banner error" role="alert">
          <strong>Couldn&apos;t reach the database.</strong> {error}
          <button className="link" onClick={refresh}>Retry</button>
        </div>
      )}

      <StreakPanel
        stats={stats}
        onOpenToday={() => setSelected(today)}
      />

      <Calendar
        month={month}
        today={today}
        entries={entries}
        firstDate={stats?.firstDate ?? null}
        loading={loading}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        onJump={setMonth}
        onToday={() => setMonth(monthOf(today))}
        onSelect={setSelected}
      />

      <ExportPanel month={month} today={today} />

      {selected && (
        <DayModal
          date={selected}
          today={today}
          entry={selectedEntry}
          onClose={() => setSelected(null)}
          onSave={async (m, e, n) => { await save(selected, m, e, n); setSelected(null); }}
          onRemove={async () => { await remove(selected); setSelected(null); }}
        />
      )}

      <footer className="foot">Missed a day? Tap it on the calendar to add it. A session counts at 15+ minutes; your streak updates automatically.</footer>
    </main>
  );
}
