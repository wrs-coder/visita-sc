import { createFileRoute, redirect } from "@tanstack/react-router";

// Endereço curto dos convites: /c/<código> abre a mesma página de confirmação.
export const Route = createFileRoute("/c/$code")({
  head: () => ({ meta: [
    { title: "Confirmar designação — Visita SC" },
    { name: "description", content: "Confirme ou recuse sua designação em um evento do circuito." },
    { name: "robots", content: "noindex, nofollow" },
    { property: "og:title", content: "Confirmar designação — Visita SC" },
    { property: "og:description", content: "Confirme ou recuse sua designação em um evento do circuito." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/confirmar/$token", params: { token: params.code }, replace: true });
  },
});
