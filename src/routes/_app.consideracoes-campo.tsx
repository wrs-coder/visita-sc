import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { isSuperintendentLocally } from "@/lib/local-role-guard";
import { OutlinesWorkspace } from "@/components/outlines/OutlinesWorkspace";

export const Route = createFileRoute("/_app/consideracoes-campo")({
  validateSearch: (search: Record<string, unknown>): {
    noteId?: string;
    mode?: "edit" | "outline";
  } => {
    const noteId = typeof search.noteId === "string" ? search.noteId : undefined;
    const mode = search.mode === "edit" || search.mode === "outline" ? search.mode : undefined;
    return { noteId, mode };
  },
  // Só confere no aparelho: a tela abre sem internet.
  beforeLoad: () => {
    if (isSuperintendentLocally() === false) throw redirect({ to: "/dashboard" });
  },
  component: Page,
  head: () => ({ meta: [
    { title: "Esboços — Visita SC" },
    { name: "description", content: "Considerações de campo e esboços pessoais do superintendente." },
    { property: "og:title", content: "Esboços — Visita SC" },
    { property: "og:description", content: "Considerações de campo e esboços pessoais do superintendente." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function Page() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const consumed = useCallback(() => { void navigate({ to: "/consideracoes-campo", search: {}, replace: true }); }, [navigate]);
  return (
    <OutlinesWorkspace
      search={search}
      onSearchConsumed={consumed}
      onForeignNote={(n) => { void navigate({ to: "/estudo-pessoal", search: { tab: "notes", noteId: n.id } }); }}
    />
  );
}
