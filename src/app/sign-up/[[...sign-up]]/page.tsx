import { notFound } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { AuthPage } from "@/components/auth/AuthPage";
import { clerkEnabled } from "@/server/config";

export const metadata = { title: "Sign up · ClarifyMe" };

export default function SignUpPage() {
  if (!clerkEnabled()) notFound();
  return (
    <AuthPage title="Keep going, it's free" subtitle="Unlimited lessons, your history saved, and the lessons you played as a guest come with you.">
      <SignUp />
    </AuthPage>
  );
}
