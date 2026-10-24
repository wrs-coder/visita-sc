import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";

const CANONICAL = "https://visitasc.com.br/termos-uso";

export const Route = createFileRoute("/termos-uso")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Visita SC" },
      { name: "description", content: "Regras de uso do Visita SC: responsabilidades da conta, uso adequado dos dados da congregação e limites do serviço." },
      { property: "og:title", content: "Termos de Uso — Visita SC" },
      { property: "og:description", content: "Condições para usar o Visita SC na organização das visitas do superintendente de circuito." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: TermsPage,
});

const SECTIONS: Array<[string, string]> = [
  ["1. Finalidade", "O Visita SC ajuda superintendentes de circuito, anciãos e a esposa do superintendente a organizar a semana de visita: programação, reuniões, refeições, transporte, esboços e anotações."],
  ["2. Sua conta", "Você é responsável por manter sua senha, PIN e códigos de acesso em sigilo e por tudo o que for feito com sua conta. Avise o superintendente se suspeitar de uso indevido."],
  ["3. Dados de outras pessoas", "Inclua apenas as informações de irmãos e famílias necessárias à visita, trate-as com discrição e não as compartilhe fora da finalidade do aplicativo."],
  ["4. Uso adequado", "Não é permitido usar o aplicativo para fins comerciais, enviar conteúdo ofensivo, tentar acessar dados de outras congregações ou burlar a segurança."],
  ["5. Conteúdo pessoal", "Esboços, anotações e anexos são seus. Muitos ficam guardados apenas no seu aparelho, por isso faça backups regularmente."],
  ["6. Disponibilidade", "O serviço é oferecido como está. Podemos fazer melhorias, pausas para manutenção ou mudanças nas funções, buscando sempre preservar seus dados."],
  ["7. Privacidade", "O tratamento dos dados segue a Política de Privacidade, que faz parte destes termos."],
  ["8. Alterações", "Estes termos podem ser atualizados. A versão em vigor fica sempre disponível nesta página."],
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" />Voltar
          </Link>
          <Logo />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Termos de Uso</h1>
            {SECTIONS.map(([title, body]) => (
              <section key={title} className="space-y-1">
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{body}</p>
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
