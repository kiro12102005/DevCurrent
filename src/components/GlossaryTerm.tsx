"use client";

import { useState } from "react";

export function GlossaryTerm({ term, explanation }: { term: string; explanation: string }) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="inline-flex flex-col items-start text-left rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 px-3 py-2 text-sm hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors w-full"
    >
      <span className="font-semibold text-indigo-700 dark:text-indigo-400">{term}</span>
      {open && <span className="mt-1 text-gray-600 dark:text-gray-400">{explanation}</span>}
    </button>
  );
}
