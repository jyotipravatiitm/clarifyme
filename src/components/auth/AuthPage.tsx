import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Mascot } from "@/components/game/Mascot";

export function AuthPage({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 px-4 py-10 lg:flex-row lg:gap-16">
      <div className="flex max-w-sm flex-col items-center text-center lg:items-start lg:text-left">
        <Link href="/" className="mb-6 inline-flex items-center gap-1 self-start font-extrabold text-ink-soft hover:text-ink">
          <ChevronLeft size={20} /> Back to lessons
        </Link>
        <Mascot mood="happy" size={140} />
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-lg font-bold text-ink-soft">{subtitle}</p>
      </div>
      <div>{children}</div>
    </main>
  );
}
