import { Logo } from "@/components/Header";
import { ThemeToggle } from "@/components/ThemeToggle";
import { card } from "@/components/ui";
import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  not_allowed: "This email isn’t on the member list.",
  link: "The link is invalid or has expired. Request a new one.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className={`${card} sm:p-8`}>
        <Logo size={40} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Study</h1>
        <LoginForm
          initialMode={error === "link" ? "link" : "signin"}
          notice={
            message && (
              <p className="mt-6 rounded-xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger">
                {message}
              </p>
            )
          }
        />
      </div>
    </main>
  );
}
