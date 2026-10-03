import { notFound } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { AuthPage } from "@/components/auth/AuthPage";
import { clerkEnabled } from "@/server/config";

export const metadata = { title: "Sign in · ClarifyMe" };

export default function SignInPage() {
  if (!clerkEnabled()) notFound();
  return (
    <AuthPage title="Welcome back!" subtitle="Pick up your streak and review every answer you've written.">
      <SignIn />
    </AuthPage>
  );
}
