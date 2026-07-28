"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pushClient";

const noopSubscribe = () => () => {};
const getServerSnapshot = () => false;

export function NotificationSubscribe() {
  // isPushSupported() reads browser-only APIs, so it must render `false` on the
  // server snapshot and only reveal the button after the client checks for real.
  const supported = useSyncExternalStore(noopSubscribe, isPushSupported, getServerSnapshot);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported) return;
    getExistingSubscription()
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [supported]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通知設定に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        title={subscribed ? "注目記事のプッシュ通知: ON" : "注目記事のプッシュ通知を受け取る"}
        className={`flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          subscribed ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-indigo-300"
        }`}
      >
        {subscribed ? "🔔 通知ON" : "🔕 通知OFF"}
      </button>
      {error && (
        <p className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-1 sm:w-56 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700 z-20">
          {error}
        </p>
      )}
    </div>
  );
}
