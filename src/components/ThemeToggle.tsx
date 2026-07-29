"use client";

import { Sun, Moon, MonitorCog } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { hapticTap } from "@/lib/haptics";

const NEXT_MODE: Record<ThemeMode, ThemeMode> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const MODE_META: Record<ThemeMode, { icon: typeof Sun; label: string }> = {
  system: { icon: MonitorCog, label: "自動（端末の設定に合わせる）" },
  light: { icon: Sun, label: "ライトモード" },
  dark: { icon: Moon, label: "ダークモード" },
};

// Icon-only, no text label ever - the header's icon row has previously
// squeezed the logo/title to zero width on a 390px screen (see AGENTS
// session history), so every icon here must stay as compact as possible.
export function ThemeToggle() {
  const { mode, setMode, loaded } = useTheme();
  if (!loaded) return <div className="w-7 h-7 shrink-0" />;

  const { icon: Icon, label } = MODE_META[mode];

  return (
    <button
      type="button"
      onClick={() => {
        hapticTap();
        setMode(NEXT_MODE[mode]);
      }}
      aria-label={`表示テーマ: ${label}（タップで切り替え）`}
      title={`表示テーマ: ${label}`}
      className="flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-700 w-7 h-7 shrink-0 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
    </button>
  );
}
