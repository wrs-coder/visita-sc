// Ferramentas avulsas do site (Conversor S-21, Analisador), fora do app.
// Esta rota só entrega o HTML de public/ferramentas; nunca importe nada de src/ aqui.
import { createFileRoute } from "@tanstack/react-router";

import s21 from "../../public/ferramentas/S21_Export/index.html?raw";
import analisador from "../../public/ferramentas/Analisador/index.html?raw";

const PAGES: Record<string, string> = { S21_Export: s21, Analisador: analisador };

export const Route = createFileRoute("/ferramentas/$ferramenta")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const html = PAGES[params.ferramenta];
        if (!html) return new Response("Not found", { status: 404 });
        return new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
        });
      },
    },
  },
});
