"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from "@clerk/nextjs";
import { useFeatures } from "@/components/Features";
import { LogIn } from "lucide-react";
import { useProgress } from "@/lib/progress";
import { needsSync, syncProgress } from "@/lib/progress-sync";
import { track } from "@/lib/analytics";

/**
 * Our own branded buttons that open Clerk's sign-in / sign-up as a modal over the page.
 * Children are the button content; className styles our button.
 */
export function SignInCta({ className = "btn3d ghost", children, from = "nav" }: { className?: string; children: React.ReactNode; from?: string }) {
  const { auth } = useFeatures();
  // Without Clerk configured there is nothing to sign in to: keep the button harmless.
  if (!auth) return <Link href="/learn" className={className}>{children}</Link>;
  return (
    <SignInButton mode="modal">
      <button type="button" className={className} onClick={() => track("sign_up_click", { from: `${from}_signin` })}>
        {children}
      </button>
    </SignInButton>
  );
}

export function SignUpCta({ className = "btn3d", children, from = "nav" }: { className?: string; children: React.ReactNode; from?: string }) {
  const { auth } = useFeatures();
  if (!auth) return <Link href="/learn" className={className}>{children}</Link>;
  return (
    <SignUpButton mode="modal">
      <button type="button" className={className} onClick={() => track("sign_up_click", { from })}>
        {children}
      </button>
    </SignUpButton>
  );
}

/** Sidebar / tab-bar account control. Only rendered when Clerk is configured. */
export function AccountButton({ compact = false }: { compact?: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  if (!isLoaded) return <div className="h-11" />;
  if (isSignedIn) {
    return (
      <div className="flex items-center gap-3 rounded-2xl px-2 py-1.5">
        <UserButton />
        {!compact && <span className="truncate font-extrabold">{user?.firstName ?? user?.username ?? "You"}</span>}
      </div>
    );
  }
  return (
    <SignInCta className={compact ? "flex flex-col items-center gap-0.5 text-xs font-extrabold" : "btn3d ghost w-full !text-sm"}>
      <LogIn size={compact ? 24 : 18} /> Sign in
    </SignInCta>
  );
}

/**
 * Keeps progress in sync for signed-in users: right after sign-in, and a moment after
 * every change (lesson, chest, quest), the browser's progress is merged into the account.
 */
export function ProgressSync() {
  const { isSignedIn } = useAuth();
  const progress = useProgress();
  useEffect(() => {
    if (!isSignedIn || !needsSync(progress)) return;
    const t = setTimeout(() => void syncProgress(), 1200);
    return () => clearTimeout(t);
  }, [isSignedIn, progress]);
  return null;
}
