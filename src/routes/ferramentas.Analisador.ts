// Analisador de congregações: ferramenta avulsa do site, fora do app (arquivos em
// public/ferramentas/Analisador). Esta rota só entrega a página quando o
// servidor não resolve a pasta sozinho; não usa nada do aplicativo.
import { createFileRoute } from "@tanstack/react-router";

import html from "../../public/ferramentas/Analisador/index.html?raw";

export const Route = createFileRoute("/ferramentas/Analisador")({
  server: {
    handlers: {
      GET: async () =>
        new Response(html, {
          headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" },
        }),
    },
  },
});
