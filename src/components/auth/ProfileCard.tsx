"use client";

import { useAuth, useClerk, useUser } from "@clerk/nextjs";
import { Settings } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";
import { SignInCta, SignUpCta } from "./Account";

/** Profile header: the signed-in user's name and avatar, or a call to create a profile. */
export function ProfileCard() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  if (!isLoaded) return <div className="card h-28" />;
  if (!isSignedIn) {
    return (
      <div className="card flex flex-col items-center gap-4 px-5 py-6 text-center sm:flex-row sm:text-left">
        <Mascot size={88} mood="happy" />
        <div className="flex-1">
          <h1 className="text-2xl font-black">Create your profile</h1>
          <p className="font-bold text-ink-soft">Save your streak on every device and review every answer you write.</p>
        </div>
        <div className="flex flex-col gap-2">
          <SignUpCta className="btn3d !text-sm" from="profile">
            Create a profile
          </SignUpCta>
          <SignInCta className="btn3d ghost !text-sm" from="profile">
            Sign in
          </SignInCta>
        </div>
      </div>
    );
  }
  return (
    <div className="card flex items-center gap-4 px-5 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element -- Clerk-hosted avatar */}
      <img src={user?.imageUrl} alt="" className="h-20 w-20 rounded-full border-4 border-line object-cover" />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-black">{user?.fullName || user?.username || "You"}</h1>
        <p className="truncate font-bold text-ink-soft">{user?.primaryEmailAddress?.emailAddress}</p>
        <p className="text-sm font-bold text-ink-soft">Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : ""}</p>
      </div>
      <button type="button" onClick={() => clerk.openUserProfile()} className="btn3d ghost !px-3" aria-label="Manage account">
        <Settings size={20} />
      </button>
    </div>
  );
}
