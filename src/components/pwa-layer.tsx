import { Download, RefreshCw, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

const DISMISS_KEY = "fitcoach-install-dismissed";

type InstallPromptEvent = Event & { prompt: () => Promise<void> };

/**
 * Handles install prompt, update-ready banner and offline indicator.
 * Rendered once from the root route; purely additive UI.
 */
export function PwaLayer() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [offline, setOffline] = useState(false);
  const [activateUpdate, setActivateUpdate] = useState<(() => void) | null>(null);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    setOffline(!navigator.onLine);

    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => setInstallEvent(null);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    void registerServiceWorker((activate) => setActivateUpdate(() => activate));

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    window.localStorage.setItem(DISMISS_KEY, "1");
  };

  return (
    <>
      {offline ? (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <WifiOff className="size-3.5" />
          You&apos;re offline — recent screens still work
        </div>
      ) : null}

      {activateUpdate ? (
        <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg md:bottom-6">
          <RefreshCw className="size-4 shrink-0 text-primary" />
          <p className="flex-1 text-sm">A new version is ready.</p>
          <Button size="sm" onClick={() => activateUpdate()}>
            Refresh
          </Button>
        </div>
      ) : null}

      {installEvent && !dismissed ? (
        <div className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-lg md:bottom-6">
          <Download className="size-4 shrink-0 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Install FitCoach AI</p>
            <p className="text-xs text-muted-foreground">Add it to your home screen for quick daily logging.</p>
          </div>
          <Button
            size="sm"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
              dismiss();
            }}
          >
            Install
          </Button>
          <button aria-label="Dismiss install prompt" onClick={dismiss} className="text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </>
  );
}
