import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { notifyFeedbackSubmission } from "@/lib/email";
import { recordAndCheckAbuse } from "@/lib/abuseAlert";

const FEEDBACK_TYPES = ["bug", "suggestion", "other"] as const;

const bodySchema = z.object({
  type: z.enum(FEEDBACK_TYPES),
  message: z.string().trim().min(1).max(2000),
  email: z.string().trim().email().max(200).optional(),
  pageContext: z.string().max(100).optional(),
});

// Deliberately usable while logged out - a bug report shouldn't require an
// account. If the submitter is logged in, their account email is used
// automatically (not the freeform `email` field, which is only for
// anonymous submitters who want a reply).
export async function POST(req: Request) {
  recordAndCheckAbuse(req, "/api/feedback");
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }
  const { type, message, email, pageContext } = parsed.data;

  const user = await getCurrentUser();
  const contactEmail = user?.email ?? email ?? null;

  await prisma.feedback.create({
    data: { type, message, email: contactEmail, userId: user?.id, pageContext },
  });

  // Best-effort - the DB row above is already saved regardless of whether
  // this succeeds, so a failure here shouldn't fail the whole request.
  await notifyFeedbackSubmission({ type, message, email: contactEmail }).catch(() => {});

  return NextResponse.json({ ok: true });
}
