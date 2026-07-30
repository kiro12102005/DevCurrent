"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { X, Palette, KeyRound, Bell, BellOff, Sun, Moon, MonitorCog, User, type LucideIcon } from "lucide-react";
import { clearStoredApiKey, maskApiKey, setStoredApiKey, useStoredApiKey } from "@/lib/apiKeyStorage";
import { useLanguage, setStoredLanguage, type Language } from "@/lib/i18n/language";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { getExistingSubscription, isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pushClient";
import { useAuth } from "@/lib/auth/AuthContext";
import { TAG_OPTIONS, type Tag } from "@/lib/tags";
import { closeSettingsPanel, useSettingsPanelOpen, useSettingsPanelRequestedTab, type SettingsTab } from "@/lib/settingsPanel";
import { hapticTap } from "@/lib/haptics";
import { useT } from "@/lib/i18n/useT";

const TAB_ORDER: SettingsTab[] = ["display", "apikey", "notifications", "account"];
const TAB_ICON: Record<SettingsTab, LucideIcon> = {
  display: Palette,
  apikey: KeyRound,
  notifications: Bell,
  account: User,
};

// One consolidated settings screen (display/language, Gemini API key,
// notifications) instead of four separate header buttons - matches the
// "everything under one gear icon" pattern most apps use, and gives
// openSettingsPanel("apikey") callers (OnboardingModal, the inline BYOK
// warnings) a single obvious place to deep-link into.
export function SettingsModal() {
  const open = useSettingsPanelOpen();
  const requestedTab = useSettingsPanelRequestedTab();
  const [tab, setTab] = useState<SettingsTab>(requestedTab);
  const t = useT();

  // Only snap to the requested tab at the moment the modal opens - once open,
  // clicking between tabs shouldn't get overridden by this. Deferred to a
  // microtask so this doesn't set state synchronously during the effect's
  // own commit phase (see react-hooks/set-state-in-effect).
  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setTab(requestedTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const TAB_LABEL: Record<SettingsTab, string> = {
    display: t.settingsModal.tabDisplay,
    apikey: t.settingsModal.tabApiKey,
    notifications: t.settingsModal.tabNotifications,
    account: t.settingsModal.tabAccount,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 print:hidden"
      onClick={closeSettingsPanel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t.settingsModal.title}</h2>
          <button
            type="button"
            onClick={closeSettingsPanel}
            aria-label={t.settingsModal.closeLabel}
            className="rounded-full p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        <div className="flex gap-1 px-3 pt-3 shrink-0">
          {TAB_ORDER.map((key) => {
            const Icon = TAB_ICON[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  hapticTap();
                  setTab(key);
                }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                  tab === key
                    ? "bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" strokeWidth={2.25} /> {TAB_LABEL[key]}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "display" && <DisplaySection />}
          {tab === "apikey" && <ApiKeySection />}
          {tab === "notifications" && <NotificationsSection />}
          {tab === "account" && <AccountSection />}
        </div>
      </div>
    </div>
  );
}

// Labels are always rendered in the language they represent (matches the old
// LanguageToggle's approach) so this never needs a dictionary lookup and
// never shows "which language is 'current language' written in" confusion.
const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "ja", label: "日本語" },
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
];

function DisplaySection() {
  const t = useT();
  const lang = useLanguage();
  const { mode, setMode, loaded } = useTheme();

  const THEME_OPTIONS: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
    { value: "system", label: t.settingsModal.themeSystem, icon: MonitorCog },
    { value: "light", label: t.settingsModal.themeLight, icon: Sun },
    { value: "dark", label: t.settingsModal.themeDark, icon: Moon },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.settingsModal.languageLabel}</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                hapticTap();
                setStoredLanguage(opt.value);
              }}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                lang === opt.value
                  ? "brand-gradient text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">{t.settingsModal.themeLabel}</p>
        {!loaded ? (
          <div className="skeleton h-10 w-full rounded-lg" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  hapticTap();
                  setMode(opt.value);
                }}
                className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                  mode === opt.value
                    ? "brand-gradient text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <opt.icon className="w-3.5 h-3.5" strokeWidth={2.25} /> {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ApiKeySection() {
  const t = useT();
  const savedKey = useStoredApiKey();
  const [input, setInput] = useState("");

  function handleSave() {
    if (!input.trim()) return;
    setStoredApiKey(input);
    setInput("");
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.apiKeySettings.description}</p>

      {savedKey ? (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm">
          <span className="font-mono text-gray-700 dark:text-gray-300">{maskApiKey(savedKey)}</span>
          <button type="button" onClick={() => clearStoredApiKey()} className="text-xs text-red-600 dark:text-red-400 hover:underline">
            {t.common.delete}
          </button>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          {t.apiKeySettings.notRegistered}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <input
          type="password"
          placeholder={t.apiKeySettings.inputPlaceholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={!input.trim()}
          className="rounded-lg brand-gradient px-3 py-2 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
        >
          {t.apiKeySettings.saveButton}
        </button>
      </div>

      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noopener noreferrer"
        className="text-center text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
      >
        {t.apiKeySettings.getKeyLink}
      </a>
    </div>
  );
}

const noopSubscribe = () => () => {};
const getServerSnapshotFalse = () => false;

function NotificationsSection() {
  const t = useT();
  const { user } = useAuth();
  // isPushSupported() reads browser-only APIs, so it must render `false` on
  // the server snapshot and only reveal the real state after client checks.
  const supported = useSyncExternalStore(noopSubscribe, isPushSupported, getServerSnapshotFalse);
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
      setError(err instanceof Error ? err.message : t.notificationSubscribe.error);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) {
    return <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.settingsModal.notificationsUnsupported}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${
          subscribed
            ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400"
            : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          {subscribed ? <Bell className="w-4 h-4" strokeWidth={2.25} /> : <BellOff className="w-4 h-4" strokeWidth={2.25} />}
          {subscribed ? t.notificationSubscribe.onLabel : t.notificationSubscribe.offLabel}
        </span>
        <span className={`text-xs font-semibold ${subscribed ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500"}`}>
          {subscribed ? "ON" : "OFF"}
        </span>
      </button>
      {error && <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>}
      {/* wantsFeaturedPush/wantsBreakingChangePush live on User, so per-type
          control only exists once there's an account to store it against -
          anonymous subscribers keep the "wants everything" broadcast
          behavior (see sendPersonalizedPush in lib/push.ts). */}
      {!user && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">{t.settingsModal.notificationTypesHint}</p>}
    </div>
  );
}

function AccountSection() {
  const t = useT();
  const { user, loading, logout } = useAuth();

  if (loading) return <div className="skeleton h-32 w-full rounded-lg" />;

  // Login/signup itself stays in the header's AuthMenu (it's the entry point
  // when there's no account yet) - this tab only covers what an already
  // logged-in user manages, plus logging out.
  if (!user) {
    return <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.settingsModal.accountLoginPrompt}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
      <AccountPreferences />
      <button
        type="button"
        onClick={async () => {
          await logout();
          closeSettingsPanel();
        }}
        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        {t.authMenu.logout}
      </button>
    </div>
  );
}

function AccountPreferences() {
  const t = useT();
  const [interestTags, setInterestTags] = useState<Tag[]>([]);
  const [stackKeywords, setStackKeywords] = useState<string[]>([]);
  const [keywordDraft, setKeywordDraft] = useState("");
  const [wantsWeeklyDigest, setWantsWeeklyDigest] = useState(false);
  const [wantsFeaturedPush, setWantsFeaturedPush] = useState(true);
  const [wantsBreakingChangePush, setWantsBreakingChangePush] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      fetch("/api/user/preferences")
        .then((res) => res.json())
        .then((data) => {
          setInterestTags(data.preferences?.interestTags ?? []);
          setStackKeywords(data.preferences?.stackKeywords ?? []);
          setWantsWeeklyDigest(data.preferences?.wantsWeeklyDigest ?? false);
          setWantsFeaturedPush(data.preferences?.wantsFeaturedPush ?? true);
          setWantsBreakingChangePush(data.preferences?.wantsBreakingChangePush ?? true);
        })
        .catch(() => {})
        .finally(() => setLoaded(true));
    });
  }, []);

  function savePreferences(next: {
    interestTags?: Tag[];
    stackKeywords?: string[];
    wantsWeeklyDigest?: boolean;
    wantsFeaturedPush?: boolean;
    wantsBreakingChangePush?: boolean;
  }) {
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch(() => {});
  }

  function toggleTag(tag: Tag) {
    const next = interestTags.includes(tag) ? interestTags.filter((tg) => tg !== tag) : [...interestTags, tag];
    setInterestTags(next);
    savePreferences({ interestTags: next });
  }

  function addKeyword(e: React.FormEvent) {
    e.preventDefault();
    const value = keywordDraft.trim();
    if (!value || stackKeywords.includes(value) || stackKeywords.length >= 15) return;
    const next = [...stackKeywords, value];
    setStackKeywords(next);
    setKeywordDraft("");
    savePreferences({ stackKeywords: next });
  }

  function removeKeyword(value: string) {
    const next = stackKeywords.filter((k) => k !== value);
    setStackKeywords(next);
    savePreferences({ stackKeywords: next });
  }

  function toggleDigest() {
    const next = !wantsWeeklyDigest;
    setWantsWeeklyDigest(next);
    savePreferences({ wantsWeeklyDigest: next });
  }

  function toggleFeaturedPush() {
    const next = !wantsFeaturedPush;
    setWantsFeaturedPush(next);
    savePreferences({ wantsFeaturedPush: next });
  }

  function toggleBreakingChangePush() {
    const next = !wantsBreakingChangePush;
    setWantsBreakingChangePush(next);
    savePreferences({ wantsBreakingChangePush: next });
  }

  if (!loaded) return <div className="skeleton h-32 w-full rounded-lg" />;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t.authMenu.notificationTypesTitle}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 leading-relaxed">{t.authMenu.notificationTypesDesc}</p>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={wantsFeaturedPush} onChange={toggleFeaturedPush} className="rounded" />
            {t.authMenu.featuredPushLabel}
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
            <input type="checkbox" checked={wantsBreakingChangePush} onChange={toggleBreakingChangePush} className="rounded" />
            {t.authMenu.breakingChangePushLabel}
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t.authMenu.interestTagsTitle}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 leading-relaxed">{t.authMenu.interestTagsDesc}</p>
        <div className="flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                interestTags.includes(tag)
                  ? "brand-gradient text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t.authMenu.stackKeywordsTitle}</p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2 leading-relaxed">{t.authMenu.stackKeywordsDesc}</p>
        {stackKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {stackKeywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2.5 py-1 text-[11px] font-semibold"
              >
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <form onSubmit={addKeyword} className="flex gap-1.5">
          <input
            type="text"
            value={keywordDraft}
            onChange={(e) => setKeywordDraft(e.target.value)}
            placeholder={t.authMenu.keywordPlaceholder}
            maxLength={40}
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          />
          <button type="submit" className="rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1.5 text-xs font-semibold">
            {t.common.add}
          </button>
        </form>
      </div>

      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
        <input type="checkbox" checked={wantsWeeklyDigest} onChange={toggleDigest} className="rounded" />
        {t.authMenu.weeklyDigestLabel}
      </label>
    </div>
  );
}
