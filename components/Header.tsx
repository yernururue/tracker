import Link from "next/link";
import { InstructionsButton } from "./Instructions";

const link = "rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface/60 hover:text-ink";

export function Header({ userId, name, withInstructions }: { userId: string; name: string; withInstructions?: boolean }) {
  return (
    <header className="mb-6 flex items-center justify-between gap-2">
      <Link href="/" className="font-semibold tracking-tight">
        Учёба
      </Link>
      <nav className="-mr-3 flex items-center">
        {withInstructions && <InstructionsButton />}
        <Link href="/reports" className={link}>
          Репорты
        </Link>
        <Link href={`/u/${userId}`} className={`${link} max-w-28 truncate sm:max-w-none`}>
          {name}
        </Link>
      </nav>
    </header>
  );
}
