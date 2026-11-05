import { LoginForm } from "./login-form";

const ERRORS: Record<string, string> = {
  not_allowed: "Этого email нет в списке участников.",
  link: "Ссылка недействительна или устарела. Запроси новую.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Учёба</h1>
      <p className="mt-2 text-muted">Вход по ссылке на почту. Пароль не нужен.</p>
      {message && (
        <p className="mt-6 rounded-xl border border-danger/30 px-4 py-3 text-sm text-danger">{message}</p>
      )}
      <LoginForm />
    </main>
  );
}
