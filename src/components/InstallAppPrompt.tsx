import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X, Zap, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classCrest } from "@/lib/images";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "install-prompt-dismissed";

/**
 * Pop-up that covers the screen (above the WhatsApp help button) to tell users
 * they can open the School Portal like an app. Android/desktop get an Install
 * button; iPhone gets Add-to-Home-Screen steps.
 */
export function InstallAppPrompt() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (standalone || window.self !== window.top || localStorage.getItem(DISMISS_KEY)) return;
    let timer: number | undefined;
    const show = () => { timer = window.setTimeout(() => setOpen(true), 1200); };
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); show(); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) { setIos(true); show(); }
    const onInstalled = () => setOpen(false);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  function dismiss() { localStorage.setItem(DISMISS_KEY, "1"); setOpen(false); }
  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setEvent(null);
    setOpen(false);
    if (choice.outcome !== "accepted") localStorage.setItem(DISMISS_KEY, "1");
  };

  const perks = [
    { icon: Zap, text: "Opens in one tap from your home screen" },
    { icon: Smartphone, text: "Full screen, just like a phone app" },
    { icon: WifiOff, text: "Loads faster, even on slow internet" },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-foreground/60 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl animate-in slide-in-from-bottom-8 zoom-in-95 duration-300"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-primary-foreground/90 hover:bg-primary-foreground/15"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center bg-gradient-to-br from-primary to-primary/80 px-6 pb-6 pt-8 text-center text-primary-foreground">
          <div className="rounded-full bg-primary-foreground p-1 shadow-lg ring-4 ring-primary-foreground/30">
            <img src={classCrest.url} alt="School crest" className="h-20 w-20 rounded-full object-cover" />
          </div>
          <h2 id="install-title" className="mt-4 text-xl font-bold">Get the School Portal app</h2>
          <p className="mt-1 text-sm text-primary-foreground/85">Kyengera Parents' School – Mugongo, right on your phone.</p>
        </div>

        <div className="space-y-5 p-6">
          <ul className="space-y-3">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          {ios ? (
            <div className="rounded-xl bg-muted p-4 text-sm">
              <p className="mb-2 font-semibold">To add it on iPhone:</p>
              <ol className="space-y-2 text-muted-foreground">
                <li className="flex items-center gap-2">1. Tap <Share className="h-4 w-4 text-primary" aria-label="Share" /> at the bottom of Safari</li>
                <li className="flex items-center gap-2">2. Choose <SquarePlus className="h-4 w-4 text-primary" aria-hidden="true" /> “Add to Home Screen”</li>
              </ol>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            {!ios && (
              <Button size="lg" className="w-full" onClick={install}>
                <Download className="mr-2 h-4 w-4" />Install the app
              </Button>
            )}
            <Button size="lg" variant={ios ? "default" : "ghost"} className="w-full" onClick={dismiss}>
              {ios ? "Got it" : "Not now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
