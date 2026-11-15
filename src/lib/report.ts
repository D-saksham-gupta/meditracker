import ExcelJS from "exceljs";
import { eachDay, weekdayName } from "./dates";
import { buildRuns, runningStreaks } from "./streak";
import { dayCounts, dayLevel, sessionCounts, type DayEntry } from "./rules";

export type ReportRow = {
  date: string;
  day: string;
  status: "Both sessions" | "Morning only" | "Evening only" | "Missed" | "Pending (today)" | "Not tracked yet";
  morning: number | null;
  evening: number | null;
  totalMinutes: number | null;
  streak: number;
  note: string;
};

export type Report = {
  title: string;
  rows: ReportRow[];
  summary: { label: string; value: string | number }[];
};

/**
 * Builds a day-by-day report for [start, end]. Future days are left out.
 * `allEntries` = every logged day ever (needed so streak numbers are right across month borders).
 */
export function buildReport(opts: {
  title: string;
  start: string;
  end: string;
  today: string;
  firstDate: string | null;
  allEntries: DayEntry[];
}): Report {
  const { title, start, today, firstDate, allEntries } = opts;
  const end = opts.end < today ? opts.end : today;
  const byDate = new Map(allEntries.map((e) => [e.date, e]));
  const streaks = runningStreaks(allEntries.filter(dayCounts).map((e) => e.date).sort());

  const rows: ReportRow[] = start > end ? [] : eachDay(start, end).map((date) => {
    const e = byDate.get(date);
    const level = dayLevel(e);
    let status: ReportRow["status"];
    if (level === 2) status = "Both sessions";
    else if (level === 1) status = sessionCounts(e!.morningMinutes) ? "Morning only" : "Evening only";
    else if (date === today) status = "Pending (today)";
    else status = firstDate && date >= firstDate ? "Missed" : "Not tracked yet";
    const total = e && (e.morningMinutes != null || e.eveningMinutes != null)
      ? (e.morningMinutes ?? 0) + (e.eveningMinutes ?? 0) : null;
    return {
      date, day: weekdayName(date), status,
      morning: e?.morningMinutes ?? null,
      evening: e?.eveningMinutes ?? null,
      totalMinutes: total,
      streak: level ? streaks.get(date) ?? 1 : 0,
      note: e?.note ?? "",
    };
  });

  const count = (s: ReportRow["status"][]) => rows.filter((r) => s.includes(r.status)).length;
  const full = count(["Both sessions"]);
  const half = count(["Morning only", "Evening only"]);
  const missed = count(["Missed"]);
  const tracked = full + half + missed;
  const meditated = rows.filter((r) => r.streak > 0).map((r) => r.date);
  const longest = buildRuns(meditated).reduce((m, r) => Math.max(m, r.length), 0);

  return {
    title,
    rows,
    summary: [
      { label: "Full days (both sessions)", value: full },
      { label: "Half days (one session)", value: half },
      { label: "Missed days", value: missed },
      { label: "Consistency (days with a session)", value: tracked ? `${Math.round(((full + half) / tracked) * 100)}%` : "-" },
      { label: "Morning sessions (15+ min)", value: rows.filter((r) => sessionCounts(r.morning)).length },
      { label: "Evening sessions (15+ min)", value: rows.filter((r) => sessionCounts(r.evening)).length },
      { label: "Longest streak in period", value: longest },
      { label: "Total minutes logged", value: rows.reduce((s, r) => s + (r.totalMinutes ?? 0), 0) },
    ],
  };
}

const HEADERS = ["Date", "Day", "Status", "Morning (min)", "Evening (min)", "Total (min)", "Streak (days)", "Note"];

function rowValues(r: ReportRow): (string | number)[] {
  return [r.date, r.day, r.status, r.morning ?? "", r.evening ?? "", r.totalMinutes ?? "", r.streak || "", r.note];
}

/** Stops spreadsheet apps from running a note like "=1+1" as a formula. */
function safeText(v: string | number): string {
  const s = String(v);
  return typeof v === "string" && /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvCell(v: string | number): string {
  const s = safeText(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(report: Report): string {
  const lines = [HEADERS, ...report.rows.map(rowValues)].map((r) => r.map(csvCell).join(","));
  // BOM so Excel opens UTF-8 correctly
  return "﻿" + lines.join("\r\n") + "\r\n";
}

const FILL: Record<ReportRow["status"], string> = {
  "Both sessions": "FFBFDFC8",
  "Morning only": "FFE3F0E6",
  "Evening only": "FFE3F0E6",
  "Missed": "FFF6D9D6",
  "Pending (today)": "FFF1EBD9",
  "Not tracked yet": "FFEFEFEF",
};

export async function toXlsx(report: Report): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Meditation Tracker";
  const ws = wb.addWorksheet("Daily log", { views: [{ state: "frozen", ySplit: 1 }] });
  const widths = [13, 12, 17, 14, 14, 12, 14, 50];
  ws.columns = HEADERS.map((header, i) => ({ header, width: widths[i] }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B5B4F" } };

  for (const r of report.rows) {
    const row = ws.addRow([r.date, r.day, r.status, r.morning, r.evening, r.totalMinutes, r.streak || null, safeText(r.note)]);
    row.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: FILL[r.status] } };
  }

  const sum = wb.addWorksheet("Summary");
  sum.columns = [{ width: 36 }, { width: 16 }];
  sum.addRow([report.title]).font = { bold: true, size: 14 };
  sum.addRow([]);
  for (const s of report.summary) sum.addRow([s.label, s.value]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
