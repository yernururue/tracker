"use client";

import { useState } from "react";
import { btnGhost, btnSecondary } from "./ui";

export function ExportButton() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnSecondary}>
        Скачать репорты
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">За сколько дней:</span>
      {[7, 14].map((d) => (
        <a key={d} href={`/api/export?days=${d}`} download className={btnSecondary} onClick={() => setOpen(false)}>
          {d} дней
        </a>
      ))}
      <button onClick={() => setOpen(false)} className={btnGhost}>
        Отмена
      </button>
    </div>
  );
}
