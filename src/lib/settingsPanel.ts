"use client";

import { useSyncExternalStore } from "react";

// Any component several levels deep (UrlSummarizer, InterviewPractice,
// OnboardingModal, ...) needs to be able to pop open the one consolidated
// Settings modal - most often jumping straight to the API key tab, since
// that's the thing new users struggle to locate. A prop-drilled callback
// would have to thread through AppShell -> every tab -> every card, so this
// follows the same module-level-state + CustomEvent pattern already used by
// apiKeyStorage.ts/language.ts instead of introducing a context provider.
export type SettingsTab = "display" | "apikey" | "notifications" | "account";

const CHANGE_EVENT = "settings-panel-changed";
let isOpen = false;
let activeTab: SettingsTab = "display";

export function openSettingsPanel(tab: SettingsTab = "display"): void {
  isOpen = true;
  activeTab = tab;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function closeSettingsPanel(): void {
  isOpen = false;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

function getIsOpen(): boolean {
  return isOpen;
}

function getActiveTab(): SettingsTab {
  return activeTab;
}

function getServerIsOpen(): boolean {
  return false;
}

function getServerActiveTab(): SettingsTab {
  return "display";
}

export function useSettingsPanelOpen(): boolean {
  return useSyncExternalStore(subscribe, getIsOpen, getServerIsOpen);
}

// Read once when the modal transitions to open (see SettingsModal) rather
// than followed live - once the user clicks a different tab inside the
// modal, this "requested" tab shouldn't yank them back.
export function useSettingsPanelRequestedTab(): SettingsTab {
  return useSyncExternalStore(subscribe, getActiveTab, getServerActiveTab);
}
