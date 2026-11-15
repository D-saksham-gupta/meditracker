import { NextResponse } from "next/server";

export const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export function serverError(e: unknown) {
  console.error(e);
  const message = e instanceof Error ? e.message : "Unexpected error";
  return NextResponse.json({ error: message }, { status: 500 });
}
