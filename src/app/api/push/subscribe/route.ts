import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "不正な購読情報です" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  // attach the logged-in account to this device, if any - lets us later
  // unsubscribe every device on an account in one action. Anonymous
  // (userId null) subscriptions remain fully supported.
  const user = await getCurrentUser();
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: user?.id ?? null },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: user?.id ?? null },
  });

  return NextResponse.json({ ok: true });
}
