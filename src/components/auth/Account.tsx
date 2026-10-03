"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { UserButton, useAuth, useUser } from "@clerk/nextjs";
import { LogIn } from "lucide-react";
import { syncProgress } from "@/lib/progress-sync";
import { track } from "@/lib/analytics";

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
    <Link href="/sign-in" onClick={() => track("sign_up_click", { from: "nav" })} className={compact ? "flex flex-col items-center gap-0.5 text-xs font-extrabold" : "btn3d ghost w-full !text-sm"}>
      <LogIn size={compact ? 24 : 18} /> Sign in
    </Link>
  );
}

/**
 * Keeps progress in sync for signed-in users: on sign-in, merge this browser's
 * progress into the account and adopt the merged copy.
 */
export function ProgressSync() {
  const { isSignedIn, userId } = useAuth();
  const synced = useRef<string | null>(null);
  useEffect(() => {
    if (!isSignedIn || !userId || synced.current === userId) return;
    synced.current = userId;
    void syncProgress();
  }, [isSignedIn, userId]);
  return null;
}
