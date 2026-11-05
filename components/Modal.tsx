"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Native <dialog>: centered on desktop, bottom sheet on mobile.
 * Closes on X, Esc and click outside.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  scrollToId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  scrollToId?: string | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus the content instead of the close button so no focus ring flashes on X.
      body.current?.focus({ preventScroll: true });
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollToId ? document.getElementById(scrollToId) : null;
    if (el && body.current) body.current.scrollTop = el.offsetTop - 16;
    else if (body.current) body.current.scrollTop = 0;
  }, [open, scrollToId]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 mx-auto max-h-[90dvh] w-full max-w-none overflow-hidden rounded-t-3xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-[#2b2219]/35 backdrop:backdrop-blur-[2px] sm:inset-0 sm:m-auto sm:max-h-[85dvh] sm:max-w-xl sm:rounded-3xl"
    >
      <div className="flex max-h-[inherit] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div ref={body} tabIndex={-1} className="relative outline-none min-h-0 flex-1 overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </div>
    </dialog>
  );
}
