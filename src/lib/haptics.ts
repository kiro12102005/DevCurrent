// Thin wrapper around the Vibration API - feature-detected (desktop browsers
// and iOS Safari don't support it; Android Chrome/WebView does), silently a
// no-op where unsupported. Kept to short, subtle pulses only (never used for
// alerts/errors) so it reads as a native-feeling tap acknowledgment rather
// than something obtrusive.
export function hapticTap() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(10);
  }
}

export function hapticSuccess() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate([10, 40, 10]);
  }
}
