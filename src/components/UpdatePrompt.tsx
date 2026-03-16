import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Check for updates every 30 seconds (faster for old users)
      const interval = setInterval(() => registration.update(), 30_000);

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
            setShowUpdate(true);
          }
        });
      });

      // If there's already a waiting worker, auto-activate after 5 seconds
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting);
        setShowUpdate(true);
        // Auto-update after 8 seconds if user doesn't click
        setTimeout(() => {
          registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        }, 8000);
      }

      return () => clearInterval(interval);
    });

    // Force update check on page visibility change (when user returns to the app)
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update();
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Reload when the new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <RefreshCw className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium">Nova atualização disponível!</span>
        <Button
          size="sm"
          variant="secondary"
          className="h-7 text-xs font-semibold"
          onClick={handleUpdate}
        >
          Recarregar
        </Button>
      </div>
    </div>
  );
}
