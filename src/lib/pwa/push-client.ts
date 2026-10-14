/** Browser-side Web Push helpers. */
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "@/lib/notifications.functions";

export type PushSupport = "supported" | "unsupported" | "needs-install" | "preview";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const host = window.location.hostname;
  if (window.self !== window.top || host.startsWith("id-preview--") || host.includes("lovableproject"))
    return "preview";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return "unsupported";
  return "supported";
}

function toKey(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function enablePush(): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notifications were blocked. Allow them in your browser settings.");
  const reg = await navigator.serviceWorker.ready;
  const { key } = await getVapidPublicKey();
  if (!key) throw new Error("Reminders are not available right now.");
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) }));
  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.["p256dh"] ?? "",
      auth: json.keys?.["auth"] ?? "",
      userAgent: navigator.userAgent.slice(0, 300),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await removePushSubscription({ data: { endpoint: sub.endpoint } });
  await sub.unsubscribe();
}
