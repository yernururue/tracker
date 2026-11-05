"use client";

import { createContext, use, useCallback, useRef, useState, type ReactNode } from "react";
import { markInstructionsSeen } from "@/app/profile-actions";
import { slugify, type MdBlock } from "@/lib/markdown";
import { Modal } from "./Modal";

type Ctx = { open: (heading?: string) => void };
const InstructionsContext = createContext<Ctx>({ open: () => {} });

export const SECTION_GOALS = "Настоящая цель — результат за неделю";
export const SECTION_REPORT = "Как писать репорт";

export function useInstructions() {
  return use(InstructionsContext);
}

export function InstructionsProvider({
  blocks,
  autoOpen,
  children,
}: {
  blocks: MdBlock[];
  autoOpen: boolean;
  children: ReactNode;
}) {
  const [isOpen, setOpen] = useState(autoOpen);
  const [target, setTarget] = useState<string | null>(null);
  const markedSeen = useRef(!autoOpen);

  const open = useCallback((heading?: string) => {
    setTarget(heading ? `ins-${slugify(heading)}` : null);
    setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    if (!markedSeen.current) {
      markedSeen.current = true;
      void markInstructionsSeen();
    }
  };

  const title = blocks.find((b) => b.type === "h1");

  return (
    <InstructionsContext value={{ open }}>
      {children}
      <Modal open={isOpen} onClose={close} title={title?.type === "h1" ? title.text : "Как учиться"} scrollToId={target}>
        <article className="max-w-[65ch] leading-relaxed">
          {blocks.map((b, i) => {
            if (b.type === "h1") return null;
            if (b.type === "h2")
              return (
                <h3 key={i} id={`ins-${b.id}`} className="mb-2 mt-7 font-semibold first:mt-0">
                  {b.text}
                </h3>
              );
            return (
              <p key={i} className="mb-3 text-[15px] text-ink/85">
                {b.lines.map((l, j) => (
                  <span key={j}>
                    {j > 0 && <br />}
                    {l}
                  </span>
                ))}
              </p>
            );
          })}
        </article>
      </Modal>
    </InstructionsContext>
  );
}

export function InstructionsButton() {
  const { open } = useInstructions();
  return (
    <button
      type="button"
      onClick={() => open()}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface/60 hover:text-ink"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M2.5 3.5c1.8-.6 3.6-.4 5.5.8 1.9-1.2 3.7-1.4 5.5-.8v9c-1.8-.6-3.6-.4-5.5.8-1.9-1.2-3.7-1.4-5.5-.8v-9zM8 4.3v9"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      Как учиться
    </button>
  );
}
