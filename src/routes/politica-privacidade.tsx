import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const CANONICAL = "https://visita-sc.lovable.app/politica-privacidade";

export const Route = createFileRoute("/politica-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Visita SC" },
      {
        name: "description",
        content:
          "Como o Visita SC coleta, usa, armazena e exclui os dados de superintendentes e anciãos: conta, congregação, esboços e anexos.",
      },
      { property: "og:title", content: "Política de Privacidade — Visita SC" },
      {
        property: "og:description",
        content:
          "Transparência sobre dados coletados, armazenamento local e em nuvem, retenção, exclusão e contato do responsável.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
  }),
  component: PrivacyPolicyPage,
});

const SECTION_KEYS = [
  "collected",
  "purpose",
  "storage",
  "sharing",
  "retention",
  "deletion",
] as const;

function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("privacy.back")}
          </Link>
          <LanguageSwitcher />
        </div>

        <header className="space-y-3 text-center">
          <Logo className="mx-auto h-12 w-auto" />
          <h1 className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            {t("privacy.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("privacy.intro")}</p>
        </header>

        <Card>
          <CardContent className="p-5 md:p-6 space-y-6">
            {SECTION_KEYS.map((key) => (
              <section key={key} className="space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  {t(`privacy.sections.${key}.title`)}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {t(`privacy.sections.${key}.body`)}
                </p>
              </section>
            ))}

            <section className="space-y-3 border-t pt-5">
              <h2 className="text-base font-semibold text-foreground">
                {t("privacy.sections.contact.title")}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("privacy.sections.contact.body")}
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:wrscircuito@gmail.com"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4 text-primary" />
                  wrscircuito@gmail.com
                </a>
                <a
                  href="https://wa.me/5571983420366"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-primary" />
                  WhatsApp: 71 98342-0366
                </a>
              </div>
            </section>

            <p className="text-[11px] text-muted-foreground border-t pt-4">
              {t("privacy.updated", { date: "01/08/2026" })}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
