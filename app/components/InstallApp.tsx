"use client";
import { useEffect, useState } from "react";

// "Install the app": HorrorScope is already an installable web app (app/manifest.ts), but
// visitors don't know it. Chrome, Edge and Android offer a real install prompt; iPhone
// Safari has none, so it gets the two-tap instructions instead. Hidden once installed.
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    // After the first paint, so the server and client render the same (nothing) first.
    const frame = requestAnimationFrame(() => {
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          (navigator as Navigator & { standalone?: boolean }).standalone === true,
      );
      setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    });
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep it for our own button
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!prompt && !ios)) return null;

  const install = async () => {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setPrompt(null);
    } else {
      setShowHelp((v) => !v);
    }
  };

  return (
    <div className="text-center mt-6">
      <button
        type="button"
        onClick={install}
        className="px-5 py-2 text-sm font-semibold rounded-lg border border-[#E3B84B] text-[#E3B84B] hover:bg-[#E3B84B] hover:text-[#0B0B14] transition"
      >
        Install the HorrorScope app
      </button>
      {showHelp && (
        <p className="text-[#D4C5F9] text-sm mt-3">
          On iPhone: tap the Share button <span aria-hidden>⬆️</span>, then <b>Add to Home Screen</b>. Moira will be one
          tap away.
        </p>
      )}
    </div>
  );
}
