import webpush from "web-push";
import { prisma } from "@/lib/prisma";

export interface PushPayload {
  title: string;
  body: string;
  url: string; // where to navigate on notification click
}

let configured = false;

function ensureConfigured(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";

  if (!publicKey || !privateKey) return false;

  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

// Broadcasts to every subscribed browser. No per-user targeting yet (Week3 auth
// will add that) - fine for an MVP where "important pick found" is global news.
export async function sendPushToAllSubscribers(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  let sent = 0;
  let removed = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // subscription expired/revoked on the browser side - stop tracking it
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          removed++;
        }
      }
    })
  );

  return { sent, removed };
}
