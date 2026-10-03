"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { CONSENT_COOKIE, type ConsentMode } from "@/lib/consent";

/**
 * Google Analytics 4 with Consent Mode v2. The consent default comes from the saved
 * cookie, or from the deployment's mode (opt-out = granted until the visitor objects).
 */
export function Analytics({ gaId, mode }: { gaId: string; mode: ConsentMode }) {
  const pathname = usePathname();

  useEffect(() => {
    window.gtag?.("event", "page_view", { page_path: pathname, page_location: window.location.href, page_title: document.title });
  }, [pathname]);

  const fallback = mode === "opt-out" ? "granted" : "denied";
  const init = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    var m = document.cookie.match(/(?:^|;\\s*)${CONSENT_COOKIE}=(granted|denied)/);
    var consent = m ? m[1] : ${JSON.stringify(fallback)};
    if (consent === "denied") window["ga-disable-${gaId}"] = true;
    gtag("consent", "default", {
      analytics_storage: consent,
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    gtag("js", new Date());
    gtag("config", ${JSON.stringify(gaId)}, { send_page_view: false, anonymize_ip: true });
  `;

  return (
    <>
      <Script id="ga-init" strategy="afterInteractive">
        {init}
      </Script>
      <Script id="ga-lib" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} />
    </>
  );
}
