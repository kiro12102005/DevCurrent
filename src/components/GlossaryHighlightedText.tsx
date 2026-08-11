"use client";

import { useEffect, useRef, useState } from "react";

type GlossaryEntry = { term: string; explanation: string };

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function GlossaryHighlightedText({
  text,
  glossary,
  className,
}: {
  text: string;
  glossary: GlossaryEntry[];
  className?: string;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!openKey) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openKey]);

  const terms = glossary.filter((g) => g.term.trim().length > 0).sort((a, b) => b.term.length - a.term.length);

  if (terms.length === 0) {
    return (
      <p className={className}>{text}</p>
    );
  }

  const pattern = new RegExp(`(${terms.map((g) => escapeRegExp(g.term)).join("|")})`, "g");
  const parts = text.split(pattern);
  const explanationByTerm = new Map(terms.map((g) => [g.term, g.explanation]));

  return (
    <p ref={containerRef} className={className}>
      {parts.map((part, i) => {
        const explanation = explanationByTerm.get(part);
        if (!explanation) return <span key={i}>{part}</span>;

        const key = `${part}-${i}`;
        const isOpen = openKey === key;

        return (
          <span key={i} className="relative inline-block">
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="underline decoration-dotted decoration-indigo-500 underline-offset-2 text-indigo-700 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded px-0.5"
            >
              {part}
            </button>
            {isOpen && (
              <span
                role="tooltip"
                className="absolute z-20 left-0 top-full mt-1 w-64 max-w-[80vw] rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-900 shadow-lg p-3 text-sm font-normal not-italic text-gray-700 dark:text-gray-300"
              >
                <span className="block font-semibold text-indigo-700 dark:text-indigo-400 mb-1">{part}</span>
                {explanation}
              </span>
            )}
          </span>
        );
      })}
    </p>
  );
}
