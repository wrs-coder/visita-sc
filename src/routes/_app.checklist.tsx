import { createFileRoute, redirect } from "@tanstack/react-router";

// A Checklist agora é a pílula "Perguntas do SC" dentro da aba Anciãos.
export const Route = createFileRoute("/_app/checklist")({
  beforeLoad: () => {
    throw redirect({ to: "/programa-ancioes", search: { tab: "questions" } });
  },
});
