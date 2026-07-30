"use client";

import { useEffect, useState } from "react";
import { Share } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

// Only rendered when the Web Share API is actually supported (mainly iOS/
// Android browsers, not most desktop browsers) - this is specifically about
// invoking the OS-native share sheet, so there's no meaningful "fallback"
// that would serve the same purpose; better to just not show the button
// than to show a broken or copy-to-clipboard-in-disguise one. Feature
// detection happens client-side only (navigator isn't available during SSR).
export function ShareButton({ title, url, className }: { title: string; url: string; className?: string }) {
  const [supported, setSupported] = useState(false);
  const t = useT();

  useEffect(() => {
    // deferred to a microtask so this effect doesn't set state synchronously
    // during its own commit phase (see react-hooks/set-state-in-effect)
    queueMicrotask(() => {
      setSupported(typeof navigator !== "undefined" && typeof navigator.share === "function");
    });
  }, []);

  if (!supported) return null;

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.share({ title, url });
    } catch {
      // AbortError when the user just dismisses the native share sheet - not an error to surface
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={t.shareButton.ariaLabel}
      className={className ?? "shrink-0 rounded-full p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"}
    >
      <Share className="w-4 h-4" strokeWidth={2.25} />
    </button>
  );
}
