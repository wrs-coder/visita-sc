// Endpoint público de versão: o aplicativo instalado consulta este endereço
// para saber se há uma versão mais nova na Play Store. Não expõe dados nem
// exige autenticação. Atualizar LATEST_APP_VERSION a cada release, junto com
// o bump em package.json / android/app/build.gradle / LoginForm.
import { createFileRoute } from "@tanstack/react-router";

import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

export const LATEST_APP_VERSION = "5.0.2";
export const MIN_SUPPORTED_APP_VERSION = "4.2.0";

// Novidades exibidas no botão "Ver novidades" do aviso. Atualizar a cada release.
export const RELEASE_NOTES: { title: string; items: string[] }[] = [
  {
    title: "Discursos e cronômetro",
    items: [
      "Tempo por tópico: horário previsto em cada parte do discurso.",
      "Toque na pílula para concluir o tópico e ver se está adiantado ou atrasado.",
      "Pílula de tempo acompanha a rolagem, com tamanho, opacidade e posição ajustáveis.",
      "Botão do relógio transforma subtítulos com tempo, como \"(4 min)\", em tópicos.",
      "Aviso de esquecimento mostra o tempo escolhido e permite descontar o tempo já falado.",
      "Cronômetro esquecido ligado pausa sozinho; opção de som nos avisos.",
    ],
  },
  {
    title: "Esboços",
    items: [
      "Rascunho salvo automaticamente, com opção de recuperar depois.",
      "Botão Sincronizar nos detalhes da tela cheia.",
    ],
  },
  {
    title: "Painel",
    items: [
      "Aba Agenda com faixa de dias para ver qualquer dia da semana.",
      "Recados da esposa agora num ícone no topo, com contador.",
      "Botão voltar do celular navega entre telas em vez de fechar o app.",
    ],
  },
  {
    title: "Sem internet",
    items: [
      "Dados guardados por 30 dias no aparelho, sem telas vazias.",
      "Aviso da idade dos dados e das alterações aguardando envio.",
      "Lista \"Não enviados\" com Tentar novamente ou Descartar.",
      "Alterações aparecem na tela na hora.",
      "Aviso quando o acesso sem internet (PIN) estiver perto de vencer.",
      "Fim do falso aviso de \"Sessão expirada\".",
    ],
  },
];

function headersFor(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const base: Record<string, string> = {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (isAllowedOrigin(origin)) {
    return { ...base, ...corsHeaders(origin) };
  }
  return base;
}

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) =>
        new Response(null, { status: 204, headers: headersFor(request) }),
      GET: async ({ request }) =>
        new Response(
          JSON.stringify({
            latest: LATEST_APP_VERSION,
            minSupported: MIN_SUPPORTED_APP_VERSION,
            notes: RELEASE_NOTES,
          }),
          { status: 200, headers: headersFor(request) },
        ),
    },
  },
});
