// Shared class strings. Kept tiny on purpose: no UI kit.
export const card = "rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6";
export const label = "text-sm font-medium text-muted";
export const input =
  "w-full rounded-xl border border-line-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-muted transition-[border-color,box-shadow] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10";
export const btnPrimary =
  "inline-flex h-12 items-center justify-center rounded-xl bg-accent px-6 font-medium text-accent-ink shadow-button transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-accent";
export const btnSecondary =
  "inline-flex h-12 items-center justify-center rounded-xl border border-line-strong bg-surface px-6 font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost =
  "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50";
export const pill = (active: boolean) =>
  `rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
    active
      ? "border-accent bg-accent text-accent-ink"
      : "border-line-strong bg-surface text-muted hover:border-ink/25 hover:text-ink"
  }`;
