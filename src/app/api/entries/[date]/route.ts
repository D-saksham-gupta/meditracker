import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { isValidDateKey, latestPossibleToday } from "@/lib/dates";
import { badRequest, serverError } from "@/lib/api";
import { normalizeEntry } from "@/lib/rules";
import { Entry } from "@/models/Entry";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ date: string }> };

/** Returns null for "empty", a rounded number for a valid value, or undefined if invalid. */
function parseMinutes(v: unknown): number | null | undefined {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1440) return undefined;
  return Math.round(n);
}

/** PUT /api/entries/2026-11-09  body: { morningMinutes?, eveningMinutes?, note? }
 *  Creates or updates that day. Past days are allowed - that's the backfill feature. */
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const { date } = await params;
    if (!isValidDateKey(date)) return badRequest("Invalid date");
    if (date > latestPossibleToday()) return badRequest("You can't log a future day");

    const body = await req.json().catch(() => ({}));
    const morningMinutes = parseMinutes(body.morningMinutes);
    const eveningMinutes = parseMinutes(body.eveningMinutes);
    if (morningMinutes === undefined || eveningMinutes === undefined) {
      return badRequest("Minutes must be a number between 0 and 1440");
    }
    if (morningMinutes === null && eveningMinutes === null) {
      return badRequest("Enter minutes for the morning and/or the evening session");
    }
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : "";

    await connectDB();
    const doc = await Entry.findOneAndUpdate(
      { date },
      { $set: { morningMinutes, eveningMinutes, note }, $unset: { minutes: "" } }, // $unset drops the old v1 field
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json(normalizeEntry(doc!));
  } catch (e) {
    return serverError(e);
  }
}

/** DELETE /api/entries/2026-11-09 → clear that day */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const { date } = await params;
    if (!isValidDateKey(date)) return badRequest("Invalid date");
    await connectDB();
    await Entry.deleteOne({ date });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
