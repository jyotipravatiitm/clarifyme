"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Trash2 } from "lucide-react";
import { resetProgress } from "@/lib/progress";

/** Lets a signed-in user wipe their sessions, answers and progress. */
export function DeleteData() {
  const { isSignedIn } = useAuth();
  const [state, setState] = useState<"idle" | "confirm" | "busy" | "done" | "error">("idle");
  if (!isSignedIn) return <p className="font-bold text-ink-soft">Sign in to delete the data saved to your account.</p>;
  if (state === "done") return <p className="font-extrabold text-good-text">Done. Your sessions, answers and progress are deleted.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {state === "confirm" ? (
        <>
          <span className="font-extrabold">This cannot be undone. Delete everything?</span>
          <button
            type="button"
            className="btn3d bad !py-2.5 !text-sm"
            onClick={async () => {
              setState("busy");
              const res = await fetch("/api/me", { method: "DELETE" }).catch(() => null);
              if (res?.ok) {
                resetProgress();
                setState("done");
              } else setState("error");
            }}
          >
            Yes, delete
          </button>
          <button type="button" className="btn3d ghost !py-2.5 !text-sm" onClick={() => setState("idle")}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className="btn3d ghost !py-2.5 !text-sm" onClick={() => setState("confirm")} disabled={state === "busy"}>
          <Trash2 size={16} /> Delete my ClarifyMe data
        </button>
      )}
      {state === "error" && <span className="font-bold text-bad-text">Something went wrong. Please try again.</span>}
    </div>
  );
}
