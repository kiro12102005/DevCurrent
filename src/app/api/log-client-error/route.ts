import { NextResponse } from "next/server";
import { z } from "zod";

// Unauthenticated by design (it needs to work for logged-out users hitting
// an error too), which means anyone can POST to it - cap field lengths so
// it can't be abused to spam Vercel's log volume/cost with huge payloads.
const MAX_FIELD_LENGTH = 2000;
const bodySchema = z.object({
  message: z.string().max(MAX_FIELD_LENGTH).optional(),
  digest: z.string().max(200).optional(),
  stack: z.string().max(MAX_FIELD_LENGTH).optional(),
});

// Client-side React errors never reach Vercel's server-side Runtime Logs on
// their own (they only ever hit the browser console) - this gives error.tsx
// / global-error.tsx somewhere to report them so they're at least visible to
// the operator, without adding a third-party error-tracking service.
export async function POST(req: Request) {
  const rawBody = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { message, digest, stack } = parsed.data;
  console.error("[client-error]", message, digest ? `digest=${digest}` : "", stack ?? "");
  return NextResponse.json({ ok: true });
}
