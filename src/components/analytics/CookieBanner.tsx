"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Cookie } from "lucide-react";
import { track } from "@/lib/analytics";
import { SETTINGS_EVENT, consentCookie, gaCookieNames, readConsent, type ConsentChoice, type ConsentMode } from "@/lib/consent";

/** Opens the cookie banner from anywhere (footer / sidebar link). */
export function openCookieSettings() {
  window.dispatchEvent(new Event(SETTINGS_EVENT));
}

export function CookieBanner({ gaId, mode }: { gaId: string; mode: ConsentMode }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<ConsentChoice | null>(null);

  useEffect(() => {
    const current = readConsent(document.cookie);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cookie is only readable after hydration
    setSaved(current);
    if (!current) setOpen(true);
    const reopen = () => {
      setSaved(readConsent(document.cookie));
      setOpen(true);
    };
    window.addEventListener(SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(SETTINGS_EVENT, reopen);
  }, []);

  function choose(choice: ConsentChoice) {
    document.cookie = consentCookie(choice, location.protocol === "https:");
    const w = window as unknown as Record<string, unknown>;
    if (choice === "denied") {
      track("cookie_opt_out");
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      w[`ga-disable-${gaId}`] = true;
      const host = location.hostname;
      const domains = ["", host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];
      for (const name of gaCookieNames(document.cookie)) {
        for (const d of domains) document.cookie = `${name}=; Path=/; Max-Age=0${d ? `; Domain=${d}` : ""}`;
      }
    } else {
      w[`ga-disable-${gaId}`] = false;
      window.gtag?.("consent", "update", { analytics_storage: "granted" });
    }
    setSaved(choice);
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="dialog"
          aria-label="Cookie settings"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          className="card fixed inset-x-3 bottom-3 z-[60] flex flex-col gap-3 p-4 sm:inset-x-auto sm:left-4 sm:max-w-sm"
        >
          <p className="flex items-center gap-2 text-lg font-black">
            <Cookie size={22} className="text-gold" style={{ color: "var(--gold-shade)" }} /> Cookies, quickly
          </p>
          <p className="text-sm font-bold text-ink-soft">
            We use Google Analytics cookies to see which lessons help people most. Your answers are never sent to Google.
            {mode === "opt-out" ? " Analytics is on unless you opt out." : " Analytics stays off unless you allow it."}{" "}
            <Link href="/privacy" className="text-brand underline underline-offset-2">
              Privacy
            </Link>
          </p>
          {saved && <p className="text-xs font-extrabold text-ink-soft">Current choice: {saved === "granted" ? "analytics allowed" : "opted out"}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn3d ghost flex-1 !px-3 !py-2.5 !text-sm" onClick={() => choose("denied")}>
              Opt out
            </button>
            <button type="button" className="btn3d flex-1 !px-3 !py-2.5 !text-sm" onClick={() => choose("granted")}>
              {mode === "opt-out" ? "OK" : "Allow"}
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
