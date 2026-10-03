import type { Metadata } from "next";
import { AppShell } from "@/components/shell/AppShell";
import { CookieSettingsButton } from "@/components/analytics/CookieSettingsButton";
import { DeleteData } from "@/components/auth/DeleteData";
import { clerkEnabled } from "@/server/config";

export const metadata: Metadata = { title: "Privacy · ClarifyMe" };

export default function PrivacyPage() {
  const ga = !!process.env.NEXT_PUBLIC_GA_ID;
  const auth = clerkEnabled();
  return (
    <AppShell>
      <article className="mx-auto flex max-w-2xl flex-col gap-6 text-lg">
        <h1 className="text-3xl font-black">Privacy</h1>
        <Section title="What we store">
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>In your browser:</strong> your XP, streak and stars (local storage), a random guest id (<code>cm_anon</code>) that counts your free lessons, and your cookie choice (<code>cm_consent</code>).
            </li>
            {auth && (
              <li>
                <strong>With an account:</strong> sign-in is handled by Clerk. We save your lesson sessions, the answers you check, the judge&apos;s feedback, and your progress, so you can review them.
              </li>
            )}
            <li>
              <strong>AI judging:</strong> when AI judging is switched on, your answer is sent to the AI provider to be judged. Do not put personal information in answers.
            </li>
          </ul>
        </Section>
        {ga && (
          <Section title="Analytics cookies">
            <p>
              We use Google Analytics to count visits and see which lessons help. It sets <code>_ga</code> cookies. We send events like &quot;lesson completed&quot;, never the text you write. Advertising features are off. You can opt out at any time:
            </p>
            <div className="mt-3">
              <CookieSettingsButton />
            </div>
          </Section>
        )}
        {auth && (
          <Section title="Delete your data">
            <p className="mb-3">Delete every session, answer and score saved to your account. To delete the account itself, use &quot;Manage account&quot; in the profile menu.</p>
            <DeleteData />
          </Section>
        )}
      </article>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card px-5 py-4 font-semibold">
      <h2 className="mb-2 text-xl font-black">{title}</h2>
      {children}
    </section>
  );
}
