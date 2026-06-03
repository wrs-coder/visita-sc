// Visualização somente leitura do Programa de Anciãos (Pastoreios,
// Encorajamento, Recomendações e Assuntos Locais). Compartilhado entre o
// painel do convidado (Acesso Corpo de Anciãos/ESC) e o Resumo da Semana
// do superintendente para garantir que ambas as telas exibam exatamente
// o mesmo conteúdo.
import { Card, CardContent } from "@/components/ui/card";

export interface ElderProgramEvent {
  id: string;
  source: "manual" | "template" | null;
  slot_label: string | null;
  companion: string | null;
  family_name: string | null;
  address: string | null;
  family_members: string | null;
  spiritual_info: string | null;
  category: "inactive" | "sick" | "special_privileges" | null;
  person_name: string | null;
  contact: string | null;
  health_info: string | null;
  purpose: "ministerial_servant" | "elder" | "redesignation" | "removal" | "cca_change" | null;
  full_name: string | null;
  field_group: string | null;
  info: string | null;
  suggested_by: string | null;
  subject: string | null;
  sources: string | null;
}

export interface ElderProgramData {
  sections: { pastoral: string; encouragement: string; recommendations: string; local: string };
  slots: Array<{ id: string; label: string }>;
  pastoral: ElderProgramEvent[];
  encouragement: ElderProgramEvent[];
  recommendations: ElderProgramEvent[];
  local: ElderProgramEvent[];
}

export const ELDER_SECTION_TITLES = {
  pastoral: "VISITAS DE PASTOREIO",
  encouragement: "ENCORAJAMENTO — INATIVOS, DOENTES, PRIVILÉGIOS ESPECIAIS",
  recommendations: "RECOMENDAÇÕES PARA ANCIÃOS E SERVOS MINISTERIAIS/CANCELAMENTOS",
  local: "ASSUNTOS LOCAIS DEFINIDOS PELO CORPO DE ANCIÃOS",
} as const;

const ELDER_CATEGORY_LABELS = {
  inactive: "Inativo",
  sick: "Doente",
  special_privileges: "Privilégios Especiais",
} as const;

const ELDER_PURPOSE_LABELS = {
  ministerial_servant: "Servo Ministerial",
  elder: "Ancião",
  redesignation: "Redesignação",
  removal: "Remoção",
  cca_change: "Mudança de CCA",
} as const;

export type ElderSectionKey = keyof typeof ELDER_SECTION_TITLES;

export function ElderProgramReadOnly({ data }: { data: ElderProgramData | null }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground text-center">
          Nenhuma informação disponível para esta visita.
        </CardContent>
      </Card>
    );
  }

  const sectionsOrder: ElderSectionKey[] = ["pastoral", "encouragement", "recommendations", "local"];

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="text-xs text-muted-foreground italic px-1 break-words">
        Pastoreios, Recomendações e outros — visualização somente leitura.
      </div>
      {sectionsOrder.map((section) => {
        const events = data[section];
        const extra = data.sections[section];
        const hasExtra = !!extra && extra.trim().length > 0;
        return (
          <Card key={section}>
            <CardContent className="p-3 sm:p-4 space-y-3">
              <h2 className="font-bold text-[11px] sm:text-xs uppercase tracking-wide text-primary leading-snug break-words">
                {ELDER_SECTION_TITLES[section]}
              </h2>

              {hasExtra && (
                <div className="rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide font-medium text-red-600 dark:text-red-400 opacity-80 break-words">
                    Informações adicionais do superintendente
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words text-red-600 dark:text-red-400 mt-0.5">{extra}</div>
                </div>
              )}

              {events.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Nenhum evento.</p>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev) => (
                    <ElderEventCardReadOnly key={ev.id} ev={ev} section={section} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ElderEventCardReadOnly({
  ev,
  section,
}: {
  ev: ElderProgramEvent;
  section: ElderSectionKey;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="p-3 space-y-1.5">
        {ev.source === "manual" && section === "recommendations" && (
          <span className="inline-block text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded bg-blue-500/10 text-blue-700 dark:text-blue-300">
            Adicionado pelos anciãos
          </span>
        )}

        {section === "pastoral" && (
          <>
            {ev.slot_label && <ReadField label="Dia/Horário" value={ev.slot_label} />}
            {ev.companion && <ReadField label="Ancião/S.M acompanhante" value={ev.companion} />}
            {ev.family_name && <ReadField label="Família/Irmão(ã)" value={ev.family_name} />}
            {ev.address && <ReadField label="Endereço" value={ev.address} />}
            {ev.family_members && <ReadField label="Membros da Família" value={ev.family_members} multiline />}
            {ev.spiritual_info && <ReadField label="Informações Espirituais e Pessoais das ovelhas" value={ev.spiritual_info} multiline />}
          </>
        )}

        {section === "encouragement" && (
          <>
            {ev.category && <ReadField label="Categoria" value={ELDER_CATEGORY_LABELS[ev.category]} />}
            {ev.person_name && <ReadField label="Nome" value={ev.person_name} />}
            {ev.address && <ReadField label="Endereço" value={ev.address} />}
            {ev.contact && <ReadField label="Contato" value={ev.contact} />}
            {ev.category === "sick" && ev.health_info && (
              <ReadField label="Problemas de Saúde" value={ev.health_info} multiline />
            )}
            {ev.spiritual_info && <ReadField label="Informações Espirituais e Pessoais das ovelhas" value={ev.spiritual_info} multiline />}
          </>
        )}

        {section === "recommendations" && (
          <>
            {ev.purpose && <ReadField label="Recomendação para:" value={ELDER_PURPOSE_LABELS[ev.purpose]} />}
            {ev.full_name && <ReadField label="Nome Completo" value={ev.full_name} />}
            {ev.family_members && <ReadField label="Membros da Família" value={ev.family_members} multiline />}
            {ev.field_group && <ReadField label="Grupo de campo" value={ev.field_group} />}
            {ev.info && <ReadField label="Informações espirituais, pessoais e familiares" value={ev.info} multiline />}
          </>
        )}

        {section === "local" && (
          <>
            {ev.suggested_by && <ReadField label="Quem indicou" value={ev.suggested_by} />}
            {ev.subject && <ReadField label="Tema do assunto" value={ev.subject} />}
            {ev.sources && <ReadField label="Fontes de matéria já pesquisadas" value={ev.sources} multiline />}
            {ev.info && <ReadField label="Informações sobre o assunto" value={ev.info} multiline />}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReadField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium break-words">{label}</div>
      <div className={`text-sm break-words ${multiline ? "whitespace-pre-wrap" : ""}`}>{value}</div>
    </div>
  );
}
