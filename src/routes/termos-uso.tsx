import { createFileRoute, useRouter } from "@tanstack/react-router";
import { FileText, X } from "lucide-react";
import { TermsContent } from "@/components/auth/terms-content";
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

function TermsPage() {
  const router = useRouter();
  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else void router.navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <button type="button" onClick={close} aria-label="Fechar" className="inline-flex h-10 w-10 items-center justify-center rounded-full border bg-card text-foreground hover:text-primary">
            <X className="h-5 w-5" />
          </button>
          <Logo />
        </div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />Termos de Uso</h1>
            <TermsContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
