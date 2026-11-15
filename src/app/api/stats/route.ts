import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { resolveToday } from "@/lib/dates";
import { serverError } from "@/lib/api";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const today = resolveToday(req.nextUrl.searchParams.get("today"));
    return NextResponse.json(await getStats(today));
  } catch (e) {
    return serverError(e);
  }
}
