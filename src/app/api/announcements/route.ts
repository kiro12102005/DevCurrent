import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { sendPushToAllSubscribers } from "@/lib/push";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

// Either the operator's own logged-in session (used by the /admin/announcements
// form) or the same CRON_SECRET already trusted for scheduler-triggered admin
// routes (feed refresh, digest send) - reused here so the coding agent
// working on this repo can publish an announcement straight from a terminal
// (curl with x-cron-secret) after finishing a significant change, without
// needing the operator's own session cookie.
async function isAuthorized(req: Request): Promise<boolean> {
  if (isAuthorizedCronRequest(req) && process.env.CRON_SECRET) return true;
  const adminEmail = process.env.ADMIN_EMAIL;
  const user = await getCurrentUser();
  return Boolean(adminEmail && user && user.email === adminEmail);
}

// Public and unauthenticated - every visitor (logged in or not) needs to see
// operator announcements, same as the feed itself.
export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ announcements });
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(4000),
});

// See isAuthorized above for who can call this. Publishing also broadcasts a
// push notification to every subscriber, regardless of their per-channel
// preferences - this is a rare, operator-authored message (system changes,
// outages, ...), not routine content, so it isn't subject to the same opt-in
// filtering as featured-pick pushes (see sendPushToAllSubscribers's doc
// comment in lib/push.ts).
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "不正なリクエストです" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({ data: parsed.data });

  await sendPushToAllSubscribers({
    title: `📢 ${parsed.data.title}`,
    body: parsed.data.body,
    url: "/",
  }).catch(() => {});

  return NextResponse.json({ announcement });
}
