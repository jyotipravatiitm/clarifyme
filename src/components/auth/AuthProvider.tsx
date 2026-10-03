import { ClerkProvider } from "@clerk/nextjs";

/** Wraps the app in Clerk only when keys are configured. */
export function AuthProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      appearance={{
        variables: {
          colorPrimary: "#1fb88a",
          fontFamily: "var(--font-nunito), ui-rounded, system-ui, sans-serif",
          borderRadius: "14px",
        },
        elements: {
          card: { boxShadow: "0 4px 0 var(--border)", border: "2px solid var(--border)" },
          formButtonPrimary: { fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", boxShadow: "0 4px 0 #138a66" },
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
