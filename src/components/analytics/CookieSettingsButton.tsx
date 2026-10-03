"use client";

import { openCookieSettings } from "./CookieBanner";

export function CookieSettingsButton() {
  return (
    <button type="button" className="btn3d ghost !py-2.5 !text-sm" onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
