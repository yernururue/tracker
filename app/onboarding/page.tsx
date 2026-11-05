import { redirect } from "next/navigation";
import { Logo } from "@/components/Header";
import { card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className={`${card} sm:p-8`}>
        <Logo size={40} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">What’s your name?</h1>
        <p className="mt-1.5 text-muted">Your friends will see this name on the dashboard.</p>
        <OnboardingForm />
      </div>
    </main>
  );
}
