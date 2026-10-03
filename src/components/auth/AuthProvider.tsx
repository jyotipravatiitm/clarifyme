import { ClerkProvider } from "@clerk/nextjs";

const BRAND = "#1fb88a";
const BRAND_SHADE = "#138a66";
const FONT = "var(--font-nunito), ui-rounded, system-ui, sans-serif";

/**
 * Wraps the app in Clerk only when keys are configured. Our own buttons open Clerk's
 * sign-in/up as a modal; this appearance makes that modal look like ClarifyMe.
 */
export function AuthProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/learn"
      signUpFallbackRedirectUrl="/learn"
      appearance={{
        options: {
          logoImageUrl: "/brand/lumi.png",
          logoLinkUrl: "/",
          socialButtonsPlacement: "top",
          socialButtonsVariant: "blockButton",
          privacyPageUrl: "/privacy",
          shimmer: true,
        },
        variables: {
          colorPrimary: BRAND,
          colorPrimaryForeground: "#ffffff",
          colorForeground: "#2b2d42",
          fontFamily: FONT,
          fontFamilyButtons: FONT,
          borderRadius: "14px",
        },
        elements: {
          modalBackdrop: { backdropFilter: "blur(6px)", background: "rgba(19, 23, 34, 0.45)" },
          card: { border: "2px solid #e5e7ef", boxShadow: "0 4px 0 #e5e7ef", borderRadius: "22px" },
          headerTitle: { fontWeight: 900, fontSize: "1.5rem" },
          headerSubtitle: { fontWeight: 700 },
          formFieldInput: { borderWidth: "2px", borderRadius: "14px", padding: "12px 14px", fontWeight: 700, background: "#f6f7fb" },
          formFieldLabel: { fontWeight: 800 },
          formButtonPrimary: {
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "14px",
            borderRadius: "16px",
            boxShadow: `0 4px 0 ${BRAND_SHADE}`,
          },
          socialButtonsBlockButton: { border: "2px solid #e5e7ef", boxShadow: "0 3px 0 #e5e7ef", borderRadius: "16px", fontWeight: 800, padding: "12px" },
          footerActionLink: { fontWeight: 900, color: "#2f8cf0" },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
