import { OfflineContent } from "@/components/OfflineContent";

export const metadata = {
  title: "オフライン - 技術トレンド キャッチアップ",
};

// Shown by the service worker (fallbacks.document in next.config.ts) when a
// page that isn't already cached is requested while offline. Cached pages
// (recently viewed feed/tools/summarize screens) still load normally.
// Split into a server wrapper (keeps the `metadata` export, which a Client
// Component page can't have) + a client content component (for the language
// switcher's translated text).
export default function OfflinePage() {
  return <OfflineContent />;
}
