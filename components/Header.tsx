import Link from "next/link";
import { InstructionsButton } from "./Instructions";

type Page = "home" | "reports" | "profile";

const link = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm transition-colors ${
    active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-muted hover:bg-surface/70 hover:text-ink"
  }`;

export function Header({
  userId,
  name,
  current,
  withInstructions,
}: {
  userId: string;
  name: string;
  current?: Page;
  withInstructions?: boolean;
}) {
  return (
    <header className="mb-6 flex items-center justify-between gap-2 sm:mb-8">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        <Logo />
        Study
      </Link>
      <nav className="-mr-1 flex items-center gap-0.5">
        {withInstructions && <InstructionsButton />}
        <Link href="/reports" className={link(current === "reports")} aria-current={current === "reports" ? "page" : undefined}>
          Reports
        </Link>
        <Link
          href={`/u/${userId}`}
          className={`${link(current === "profile")} max-w-28 truncate sm:max-w-none`}
          aria-current={current === "profile" ? "page" : undefined}
        >
          {name}
        </Link>
      </nav>
    </header>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg bg-accent text-accent-ink shadow-button"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg width={size * 0.57} height={size * 0.57} viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8.6" r="5.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 5.8v2.9l1.9 1.2M6.4 1.6h3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
