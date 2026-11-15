import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { isValidMonthKey, monthRange } from "@/lib/dates";
import { badRequest, serverError } from "@/lib/api";
import { Entry } from "@/models/Entry";
import { normalizeEntry } from "@/lib/rules";

export const dynamic = "force-dynamic";

/** GET /api/entries?month=2026-11  → all logged days in that month */
export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month");
    if (!isValidMonthKey(month)) return badRequest("month must look like YYYY-MM");
    await connectDB();
    const { start, end } = monthRange(month);
    const docs = await Entry.find({ date: { $gte: start, $lte: end } })
      .sort({ date: 1 })
      .lean();
    return NextResponse.json({
      entries: docs.map(normalizeEntry),
    });
  } catch (e) {
    return serverError(e);
  }
}
