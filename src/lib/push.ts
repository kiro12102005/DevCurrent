import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import type { Tag } from "@/lib/tags";

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

async function deliver(sub: { id: string; endpoint: string; p256dh: string; auth: string }, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
    return "sent" as const;
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // subscription expired/revoked on the browser side - stop tracking it
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return "removed" as const;
    }
    return "failed" as const;
  }
}

// Broadcasts to every subscribed browser, with no per-article filtering.
// Used for anything that isn't tag-scoped (e.g. a manual admin broadcast).
export async function sendPushToAllSubscribers(payload: PushPayload): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured()) {
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany();
  const results = await Promise.all(subscriptions.map((sub) => deliver(sub, payload)));
  return {
    sent: results.filter((r) => r === "sent").length,
    removed: results.filter((r) => r === "removed").length,
  };
}

function composePayload(articles: { title: string; url: string }[]): PushPayload {
  if (articles.length === 1) {
    return { title: "注目の技術記事を見つけました", body: articles[0].title, url: articles[0].url };
  }
  return {
    title: `注目の技術記事を${articles.length}件見つけました`,
    body: articles.map((a) => a.title).join(" / "),
    url: "/",
  };
}

// Personalizes by src/lib/tags.ts: a subscriber linked to a user who has
// chosen interestTags only gets notified about newly-featured articles that
// match at least one of them (skipped entirely if none match). Anonymous
// subscriptions, and logged-in users who haven't set any interests, keep the
// original "wants everything" broadcast behavior - personalization is opt-in.
export async function sendPersonalizedPush(
  articles: { title: string; url: string; tags: Tag[] }[]
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured() || articles.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    include: { user: { select: { interestTags: true } } },
  });

  const results = await Promise.all(
    subscriptions.map((sub) => {
      const interests = sub.user?.interestTags ?? [];
      const relevant = interests.length === 0 ? articles : articles.filter((a) => a.tags.some((t) => interests.includes(t)));
      if (relevant.length === 0) return Promise.resolve("skipped" as const);
      return deliver(sub, composePayload(relevant));
    })
  );

  return {
    sent: results.filter((r) => r === "sent").length,
    removed: results.filter((r) => r === "removed").length,
  };
}
