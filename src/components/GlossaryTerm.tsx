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
      className="inline-flex flex-col items-start text-left rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm hover:bg-indigo-100 transition-colors w-full"
    >
      <span className="font-semibold text-indigo-700">{term}</span>
      {open && <span className="mt-1 text-gray-600">{explanation}</span>}
    </button>
  );
}
