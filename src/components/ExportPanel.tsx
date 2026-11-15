"use client";

import { useState } from "react";
import { MONTH_NAMES, monthLabel } from "@/lib/clientDates";

export default function ExportPanel({ month, today }: { month: string; today: string }) {
  const [scope, setScope] = useState<"month" | "year">("month");
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const thisYear = Number(today.slice(0, 4));
  const [year, setYear] = useState<number | null>(null);

  const yr = year ?? Number(month.slice(0, 4));
  const years = Array.from({ length: thisYear - 2019 }, (_, i) => thisYear - i);
  const value = scope === "month" ? month : String(yr);
  const href = `/api/export?scope=${scope}&value=${value}&format=${format}&today=${today}`;

  return (
    <section className="card export">
      <h2>Download report</h2>
      <div className="export-row">
        <div className="seg" role="radiogroup" aria-label="Period">
          <button role="radio" aria-checked={scope === "month"} className={scope === "month" ? "on" : ""} onClick={() => setScope("month")}>
            Month
          </button>
          <button role="radio" aria-checked={scope === "year"} className={scope === "year" ? "on" : ""} onClick={() => setScope("year")}>
            Full year
          </button>
        </div>

        {scope === "year" ? (
          <select aria-label="Year" value={yr} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        ) : (
          <span className="muted">{monthLabel(month)} <small>(the month shown above)</small></span>
        )}

        <div className="seg" role="radiogroup" aria-label="Format">
          <button role="radio" aria-checked={format === "xlsx"} className={format === "xlsx" ? "on" : ""} onClick={() => setFormat("xlsx")}>Excel</button>
          <button role="radio" aria-checked={format === "csv"} className={format === "csv" ? "on" : ""} onClick={() => setFormat("csv")}>CSV</button>
        </div>

        <a className="btn primary" href={href} download>
          Download {scope === "month" ? MONTH_NAMES[Number(month.slice(5)) - 1] : yr}
        </a>
      </div>
    </section>
  );
}
