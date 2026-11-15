import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { isValidMonthKey, isValidYear, monthRange, resolveToday, yearRange } from "@/lib/dates";
import { badRequest, serverError } from "@/lib/api";
import { Entry } from "@/models/Entry";
import { buildReport, toCsv, toXlsx } from "@/lib/report";
import { dayCounts, normalizeEntry } from "@/lib/rules";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

/**
 * GET /api/export?scope=month&value=2026-11&format=csv|xlsx&today=YYYY-MM-DD
 * GET /api/export?scope=year&value=2026&format=csv|xlsx
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams;
    const scope = q.get("scope");
    const value = q.get("value");
    const format = q.get("format") ?? "csv";
    if (format !== "csv" && format !== "xlsx") return badRequest("format must be csv or xlsx");

    let start: string, end: string, title: string, filename: string;
    if (scope === "month" && isValidMonthKey(value)) {
      ({ start, end } = monthRange(value));
      title = `Meditation report - ${MONTHS[Number(value.slice(5)) - 1]} ${value.slice(0, 4)}`;
      filename = `meditation-${value}`;
    } else if (scope === "year" && isValidYear(value)) {
      ({ start, end } = yearRange(value));
      title = `Meditation report - ${value}`;
      filename = `meditation-${value}`;
    } else {
      return badRequest("scope must be 'month' (value YYYY-MM) or 'year' (value YYYY)");
    }

    const today = resolveToday(q.get("today"));
    await connectDB();
    const allEntries = (await Entry.find({}).sort({ date: 1 }).lean()).map(normalizeEntry);
    const firstDate = allEntries.find(dayCounts)?.date ?? null;

    const report = buildReport({ title, start, end, today, firstDate, allEntries });

    if (format === "csv") {
      return new NextResponse(toCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const buf = await toXlsx(report);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return serverError(e);
  }
}
