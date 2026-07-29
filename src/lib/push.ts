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

// The breaking-change channel (see wantsBreakingChangePush) is independent
// of interestTags/stackKeywords - it doesn't need a matched keyword to
// justify the 🚨 framing, unlike composePersonalizedPayload below.
// Exported for unit testing (see push.test.ts).
export function composeBreakingChangePayload(breakingArticles: { title: string; url: string }[]): PushPayload {
  if (breakingArticles.length === 1) {
    return { title: "🚨 破壊的変更の可能性", body: breakingArticles[0].title, url: breakingArticles[0].url };
  }
  return {
    title: `🚨 破壊的変更の可能性がある記事を${breakingArticles.length}件検知`,
    body: breakingArticles.map((a) => a.title).join(" / "),
    url: "/",
  };
}

type PersonalizableArticle = { title: string; url: string; tags: Tag[]; isBreakingChange: boolean };

// A stack-keyword match on a breaking-change article is the highest-signal
// notification this app can send ("something you actually use might stop
// working") - lead with that specific article instead of the usual
// "N articles found" summary, even if other relevant articles exist too.
function composePersonalizedPayload(relevant: PersonalizableArticle[], matchedKeyword: string | null): PushPayload {
  if (matchedKeyword) {
    const breaking = relevant.find((a) => a.isBreakingChange);
    if (breaking) {
      return { title: `🚨 ${matchedKeyword}に破壊的変更の可能性`, body: breaking.title, url: breaking.url };
    }
  }
  return composePayload(relevant);
}

// Personalizes by src/lib/tags.ts categories AND freeform stackKeywords
// (substring match against the title - e.g. a user who added "PyTorch" gets
// notified about a PyTorch article even though it's not one of the fixed
// tag categories). A subscriber linked to a user who has set either only
// gets notified about newly-featured articles matching at least one
// (skipped entirely if none match). Anonymous subscriptions, and logged-in
// users with no interests/keywords set at all, keep the original
// "wants everything" broadcast behavior - personalization is opt-in.
//
// wantsFeaturedPush / wantsBreakingChangePush (both default true) are
// separate ON/OFF channels, not content filters like interestTags/
// stackKeywords above - a user can turn off general featured-pick
// notifications entirely while keeping breaking-change alerts on, or vice
// versa. Breaking-change articles are pulled into their own channel first
// (at most one notification per subscriber per batch, never both) so a
// subscriber never gets double-notified about the same article.
export async function sendPersonalizedPush(
  articles: PersonalizableArticle[]
): Promise<{ sent: number; removed: number }> {
  if (!ensureConfigured() || articles.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    include: {
      user: {
        select: { interestTags: true, stackKeywords: true, wantsFeaturedPush: true, wantsBreakingChangePush: true },
      },
    },
  });

  const breakingArticles = articles.filter((a) => a.isBreakingChange);

  const results = await Promise.all(
    subscriptions.map((sub) => {
      // Anonymous (unlinked) subscriptions have no per-channel preference to
      // read - keep the original "wants everything" broadcast behavior.
      const wantsFeatured = sub.user?.wantsFeaturedPush ?? true;
      const wantsBreaking = sub.user?.wantsBreakingChangePush ?? true;

      if (wantsBreaking && breakingArticles.length > 0) {
        return deliver(sub, composeBreakingChangePayload(breakingArticles));
      }
      if (!wantsFeatured) return Promise.resolve("skipped" as const);

      const interests = sub.user?.interestTags ?? [];
      const keywords = sub.user?.stackKeywords ?? [];
      if (interests.length === 0 && keywords.length === 0) {
        return deliver(sub, composePayload(articles));
      }
      const matchedKeyword = keywords.find((kw) => articles.some((a) => a.title.toLowerCase().includes(kw.toLowerCase()))) ?? null;
      const relevant = articles.filter(
        (a) =>
          a.tags.some((t) => interests.includes(t)) ||
          keywords.some((kw) => a.title.toLowerCase().includes(kw.toLowerCase()))
      );
      if (relevant.length === 0) return Promise.resolve("skipped" as const);
      return deliver(sub, composePersonalizedPayload(relevant, matchedKeyword));
    })
  );

  return {
    sent: results.filter((r) => r === "sent").length,
    removed: results.filter((r) => r === "removed").length,
  };
}
