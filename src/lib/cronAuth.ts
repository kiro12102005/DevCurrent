// Shared auth check for scheduler-triggered routes (feed refresh, AI tool pick
// refresh). Accepts either convention so the same CRON_SECRET works whether
// the caller is our own GitHub Actions workflow (custom x-cron-secret header)
// or Vercel Cron (which auto-sends "Authorization: Bearer $CRON_SECRET" for a
// project env var literally named CRON_SECRET - see vercel.json).
export function isAuthorizedCronRequest(req: Request): boolean {
  const requiredSecret = process.env.CRON_SECRET;
  if (!requiredSecret) return true; // no secret configured - open endpoint (local dev default)

  const customHeader = req.headers.get("x-cron-secret");
  if (customHeader === requiredSecret) return true;

  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${requiredSecret}`) return true;

  return false;
}
