/**
 * Service worker registration wrapper.
 *
 * This is the ONLY place the FitCoach AI service worker is registered.
 * It refuses to register in dev, inside an iframe, in Lovable preview hosts,
 * or when `?sw=off` is present — and unregisters any stale worker there.
 */

const SW_URL = "/sw.js";

function isPreviewHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false;
  if (!import.meta.env.PROD) return false;
  if (window.self !== window.top) return false;
  if (isPreviewHost(window.location.hostname)) return false;
  if (new URLSearchParams(window.location.search).has("sw=off")) return false;
  if (window.location.search.includes("sw=off")) return false;
  return true;
}

async function unregisterExisting(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => (registration.active?.scriptURL ?? "").endsWith(SW_URL))
      .map((registration) => registration.unregister()),
  );
}

/**
 * Registers the service worker when allowed.
 * `onUpdateReady` fires when a newer version is waiting to take over.
 */
export async function registerServiceWorker(onUpdateReady: (activate: () => void) => void) {
  if (!shouldRegisterServiceWorker()) {
    await unregisterExisting();
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });

    const notify = (worker: ServiceWorker | null) => {
      if (!worker) return;
      onUpdateReady(() => {
        worker.postMessage({ type: "SKIP_WAITING" });
        // The controllerchange listener below reloads once the new worker is active.
      });
    };

    if (registration.waiting && navigator.serviceWorker.controller) notify(registration.waiting);

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          notify(registration.waiting ?? installing);
        }
      });
    });

    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    });
  } catch (error) {
    console.warn("[pwa] service worker registration failed", error);
  }
}
