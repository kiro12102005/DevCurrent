import { notifyAbuseDetected } from "@/lib/email";

// In-memory, per-serverless-instance only (resets on cold start, not shared
// across regions/instances) - deliberately avoids writing to Postgres on
// every request to these endpoints, given this app's past connection-pool
// incident (see docs/DESIGN_DECISIONS.md). This is a best-effort early
// warning for the operator's inbox, not the actual enforcement layer - that's
// the Vercel Firewall rule staged in DEPLOY.md section 7, which the operator
// can promote from log-only to real blocking once they've reviewed dashboard
// traffic. Fluid Compute keeps instances warm across concurrent requests, so
// this still catches a meaningful share of sustained abuse from one source in
// practice, even though it undercounts vs. the Firewall's own all-region view.
const hitLog = new Map<string, number[]>();
const lastAlertSentAt = new Map<string, number>();

const WINDOW_MS = 5 * 60 * 1000;
// Well above the Firewall's own 15-per-300s threshold (see DEPLOY.md) so a
// shared/NAT IP with several legitimate users doesn't trigger an email.
const ALERT_THRESHOLD = 40;
const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
// Safety valve against unbounded memory growth on a long-lived warm instance
// - crude (drops all tracked history) but this app's traffic doesn't come
// close to it outside of an actual large-scale attack, where a reset costs little.
const MAX_TRACKED_IPS = 2000;

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || null;
}

// Call from a route handler without awaiting - this only ever fires a
// best-effort email in the rare case a threshold is crossed and shouldn't add
// latency to the actual request.
export function recordAndCheckAbuse(req: Request, path: string): void {
  const ip = getClientIp(req);
  if (!ip) return;

  if (hitLog.size > MAX_TRACKED_IPS) hitLog.clear();
  if (lastAlertSentAt.size > MAX_TRACKED_IPS) lastAlertSentAt.clear();

  const now = Date.now();
  const hits = (hitLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  hitLog.set(ip, hits);

  if (hits.length < ALERT_THRESHOLD) return;

  const lastAlert = lastAlertSentAt.get(ip) ?? 0;
  if (now - lastAlert < ALERT_COOLDOWN_MS) return;
  lastAlertSentAt.set(ip, now);

  notifyAbuseDetected({ ip, path, hitCount: hits.length, windowMinutes: WINDOW_MS / 60000 }).catch((err) =>
    console.error("[abuseAlert] notification failed:", err)
  );
}
