"use client";

import { useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/types";
import { prettyDate } from "@/lib/clientDates";
import { MIN_SESSION_MINUTES, sessionCounts } from "@/lib/rules";

type Props = {
  date: string;
  today: string;
  entry: Entry | null;
  onClose: () => void;
  onSave: (morning: number | null, evening: number | null, note: string) => Promise<void>;
  onRemove: () => Promise<void>;
};

const toNum = (s: string): number | null => (s.trim() === "" ? null : Number(s));

function Hint({ value }: { value: string }) {
  const n = toNum(value);
  if (n === null) return <span className="hint">Not done</span>;
  return sessionCounts(n)
    ? <span className="hint ok">✓ Counts</span>
    : <span className="hint warn">Under {MIN_SESSION_MINUTES} min - won&apos;t count</span>;
}

export default function DayModal({ date, today, entry, onClose, onSave, onRemove }: Props) {
  const [morning, setMorning] = useState(entry?.morningMinutes?.toString() ?? "");
  const [evening, setEvening] = useState(entry?.eveningMinutes?.toString() ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("input")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); setBusy(false); }
  }

  const isPast = date < today;
  const empty = morning.trim() === "" && evening.trim() === "";

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="dm-title" ref={ref}>
        <h3 id="dm-title">{prettyDate(date)}</h3>
        <p className="muted">
          {entry ? "Update this day's sessions." : isPast ? "Forgot to log this day? Add it now and your streak will update." : "Log today's sessions."}
          {" "}A session counts when it&apos;s at least {MIN_SESSION_MINUTES} minutes.
        </p>

        <div className="sessions">
          <label>
            <span className="lbl">☀ Morning <Hint value={morning} /></span>
            <input type="number" inputMode="numeric" min={0} max={1440} value={morning} onChange={(e) => setMorning(e.target.value)} placeholder="minutes" />
          </label>
          <label>
            <span className="lbl">☾ Evening <Hint value={evening} /></span>
            <input type="number" inputMode="numeric" min={0} max={1440} value={evening} onChange={(e) => setEvening(e.target.value)} placeholder="minutes" />
          </label>
        </div>
        <label>
          Note <span className="muted">(optional)</span>
          <textarea rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="How did it feel?" />
        </label>

        {err && <p className="error-text" role="alert">{err}</p>}

        <div className="actions">
          {entry && <button className="btn danger" disabled={busy} onClick={() => run(onRemove)}>Clear day</button>}
          <span className="spacer" />
          <button className="btn ghost" disabled={busy} onClick={onClose}>Cancel</button>
          <button
            className="btn primary"
            disabled={busy || empty}
            title={empty ? "Enter minutes for morning and/or evening" : undefined}
            onClick={() => run(() => onSave(toNum(morning), toNum(evening), note))}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
