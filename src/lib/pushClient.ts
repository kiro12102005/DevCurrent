export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

// VAPID public keys are base64url-encoded; PushManager wants raw bytes.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

// next-pwa's service worker is intentionally disabled in `next dev` (see
// next.config.ts), so no SW is ever registered there. `navigator.serviceWorker
// .ready` waits for one to become active and never resolves in that case,
// which used to hang the subscribe button forever. getRegistration() resolves
// immediately either way, so we can fail fast with a clear message instead.
async function getActiveRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  return navigator.serviceWorker.getRegistration();
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await getActiveRegistration();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<void> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("通知機能が設定されていません（VAPID_PUBLIC_KEY未設定）");
  }

  const registration = await getActiveRegistration();
  if (!registration) {
    throw new Error(
      "Service Workerが見つかりません。開発モードではプッシュ通知は無効です。本番ビルド（pnpm build && pnpm start）で試してください。"
    );
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("通知が許可されませんでした");
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
  });
  if (!res.ok) {
    throw new Error("通知登録に失敗しました");
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  const subscription = await getExistingSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
}
