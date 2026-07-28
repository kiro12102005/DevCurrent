export const metadata = {
  title: "オフライン - 技術トレンド キャッチアップ",
};

// Shown by the service worker (fallbacks.document in next.config.ts) when a
// page that isn't already cached is requested while offline. Cached pages
// (recently viewed feed/tools/summarize screens) still load normally.
export default function OfflinePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl">📡</p>
      <h1 className="text-lg font-bold brand-gradient-text">オフラインです</h1>
      <p className="text-sm text-gray-500 max-w-xs">
        インターネット接続が確認できませんでした。接続を確認してから、もう一度お試しください。以前に閲覧したページはキャッシュから表示できる場合があります。
      </p>
    </div>
  );
}
