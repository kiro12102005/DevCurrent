import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { sendPushToAllSubscribers } from "@/lib/push";

async function isAdmin(): Promise<boolean> {
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

// Gated the same way as /admin/usage (logged-in user's email === ADMIN_EMAIL) -
// this app has exactly one operator, so there's no role column to check
// instead. Publishing also broadcasts a push notification to every
// subscriber, regardless of their per-channel preferences - this is a rare,
// operator-authored message (system changes, outages, ...), not routine
// content, so it isn't subject to the same opt-in filtering as featured-pick
// pushes (see sendPushToAllSubscribers's doc comment in lib/push.ts).
export async function POST(req: Request) {
  if (!(await isAdmin())) {
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
