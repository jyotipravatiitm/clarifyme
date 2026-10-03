import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import { Providers } from "@/components/Providers";
import { FeaturesProvider, type Features } from "@/components/Features";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Analytics } from "@/components/analytics/Analytics";
import { CookieBanner } from "@/components/analytics/CookieBanner";
import { consentMode } from "@/lib/consent";
import { clerkEnabled } from "@/server/config";
import "./globals.css";

// Self-hosted (SIL OFL, see fonts/OFL.txt) so builds never depend on fonts.googleapis.com.
const nunito = localFont({ src: "./fonts/nunito-latin-wght.woff2", weight: "200 1000", variable: "--font-nunito" });

export const metadata: Metadata = {
  title: "ClarifyMe",
  description: "Bite-size games that train clear writing and clear thinking.",
};

export const viewport: Viewport = {
  themeColor: "#1fb88a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read env at request time, so one Docker image works with any configuration.
  await connection();
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim() || "";
  const mode = consentMode(process.env.NEXT_PUBLIC_GA_CONSENT);
  const features: Features = { auth: clerkEnabled(), db: !!process.env.DATABASE_URL, analytics: !!gaId };
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh antialiased">
        <AuthProvider enabled={features.auth}>
          <FeaturesProvider value={features}>
            <Providers>{children}</Providers>
            {gaId && <CookieBanner gaId={gaId} mode={mode} />}
          </FeaturesProvider>
        </AuthProvider>
        {gaId && <Analytics gaId={gaId} mode={mode} />}
      </body>
    </html>
  );
}
