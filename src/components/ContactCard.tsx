"use client";

import { Briefcase, Mail } from "lucide-react";
import { useT } from "@/lib/i18n/useT";

const CONTACT_EMAIL = "contact.somakida@gmail.com";

// Static, public-facing contact info (not a secret/config value like
// FEEDBACK_NOTIFY_EMAIL, so it's fine to hardcode rather than env-configure)
// for recruiters/clients who find this app via a portfolio/job-hunting
// context - separate from the bug-report-oriented feedback form below it.
export function ContactCard() {
  const t = useT();

  return (
    <div className="rounded-xl bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-800 p-5">
      <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 flex items-center gap-1.5">
        <Briefcase className="w-4 h-4" strokeWidth={2.25} /> {t.contactCard.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">{t.contactCard.description}</p>
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="inline-flex items-center gap-1.5 rounded-lg brand-gradient px-4 py-2 text-sm font-semibold text-white"
      >
        <Mail className="w-3.5 h-3.5" strokeWidth={2.25} /> {CONTACT_EMAIL}
      </a>
    </div>
  );
}
