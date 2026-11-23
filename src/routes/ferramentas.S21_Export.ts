// Conversor S-21: ferramenta avulsa do site, fora do app (arquivos em
// public/ferramentas/S21_Export). Esta rota só entrega a página quando o
// servidor não resolve a pasta sozinho; não usa nada do aplicativo.
import { createFileRoute } from "@tanstack/react-router";

import html from "../../public/ferramentas/S21_Export/index.html?raw";

export const Route = createFileRoute("/ferramentas/S21_Export")({
  server: {
    handlers: {
      GET: async () =>
        new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
        }),
    },
  },
});
