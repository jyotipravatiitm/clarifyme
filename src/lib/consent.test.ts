import { describe, expect, it } from "vitest";
import { consentCookie, consentMode, effectiveConsent, gaCookieNames, readConsent } from "./consent";

describe("consent", () => {
  it("defaults to opt-out mode", () => {
    expect(consentMode(undefined)).toBe("opt-out");
    expect(consentMode("opt-in")).toBe("opt-in");
  });
  it("reads the saved choice", () => {
    expect(readConsent("a=1; cm_consent=denied; b=2")).toBe("denied");
    expect(readConsent("cm_consent=granted")).toBe("granted");
    expect(readConsent("xcm_consent=denied")).toBeNull();
    expect(readConsent("")).toBeNull();
  });
  it("decides the effective consent", () => {
    expect(effectiveConsent("opt-out", null)).toBe("granted");
    expect(effectiveConsent("opt-in", null)).toBe("denied");
    expect(effectiveConsent("opt-out", "denied")).toBe("denied");
  });
  it("finds GA cookies to delete", () => {
    expect(gaCookieNames("_ga=1; _ga_ABC123=2; _gid=3; cm_consent=denied; _gat_x=1; other=1")).toEqual(["_ga", "_ga_ABC123", "_gid", "_gat_x"]);
  });
  it("builds a one-year cookie", () => {
    expect(consentCookie("denied", true)).toMatch(/^cm_consent=denied; Path=\/; Max-Age=31536000; SameSite=Lax; Secure$/);
  });
});
