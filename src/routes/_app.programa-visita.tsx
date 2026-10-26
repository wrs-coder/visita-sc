import { createFileRoute, redirect } from "@tanstack/react-router";
import { VISIT_PROGRAM_PATHS, VISIT_PROGRAM_PREF } from "@/components/visit-week/VisitProgramTabs";
import { readPref } from "@/lib/template-day-pills";

export const Route = createFileRoute("/_app/programa-visita")({
  beforeLoad: () => {
    const saved = typeof window === "undefined" ? null : readPref<string | null>(VISIT_PROGRAM_PREF, null);
    const to = saved && VISIT_PROGRAM_PATHS.includes(saved) ? saved : "/programa-ancioes";
    throw redirect({ to: to as "/programa-ancioes" });
  },
  head: () => ({
    meta: [
      { title: "Programa da visita — Visita SC" },
      { name: "description", content: "Anciãos, estudos, reuniões, refeições, transporte e checklist da visita." },
      { property: "og:title", content: "Programa da visita — Visita SC" },
      { property: "og:description", content: "Anciãos, estudos, reuniões, refeições, transporte e checklist da visita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
