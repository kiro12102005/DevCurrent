"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff } from "lucide-react";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pushClient";
import { useT } from "@/lib/i18n/useT";

const noopSubscribe = () => () => {};
const getServerSnapshot = () => false;

export function NotificationSubscribe() {
  // isPushSupported() reads browser-only APIs, so it must render `false` on the
  // server snapshot and only reveal the button after the client checks for real.
  const supported = useSyncExternalStore(noopSubscribe, isPushSupported, getServerSnapshot);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useT();

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
      setError(err instanceof Error ? err.message : t.notificationSubscribe.error);
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
        title={subscribed ? t.notificationSubscribe.onTitle : t.notificationSubscribe.onPrompt}
        aria-label={subscribed ? t.notificationSubscribe.onAriaLabel : t.notificationSubscribe.offAriaLabel}
        className={`flex items-center gap-1 rounded-full border px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          subscribed ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600"
        }`}
      >
        {subscribed ? (
          <>
            <Bell className="w-3.5 h-3.5" strokeWidth={2.25} /> <span className="hidden sm:inline">{t.notificationSubscribe.onLabel}</span>
          </>
        ) : (
          <>
            <BellOff className="w-3.5 h-3.5" strokeWidth={2.25} /> <span className="hidden sm:inline">{t.notificationSubscribe.offLabel}</span>
          </>
        )}
      </button>
      {error && (
        <p className="fixed inset-x-4 top-16 sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:left-auto sm:mt-1 sm:w-56 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 px-2 py-1 text-[11px] text-red-700 dark:text-red-400 z-20">
          {error}
        </p>
      )}
    </div>
  );
}
