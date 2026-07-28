import { NextResponse } from "next/server";

// Client-side React errors never reach Vercel's server-side Runtime Logs on
// their own (they only ever hit the browser console) - this gives error.tsx
// / global-error.tsx somewhere to report them so they're at least visible to
// the operator, without adding a third-party error-tracking service.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  console.error("[client-error]", body?.message, body?.digest ? `digest=${body.digest}` : "", body?.stack ?? "");
  return NextResponse.json({ ok: true });
}
