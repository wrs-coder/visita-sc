
# Pontos 1 e 2 — Aplicação automática de modelos + PDF de backup + notificações

## Objetivo

Sempre que o superintendente alterar um modelo (reuniões/discursos, reuniões de campo, refeições, transporte, checklist, programa anciãos), a mudança é propagada automaticamente para todas as visitas futuras que usam aquele modelo. Os anciãos veem um aviso amigável, podem baixar um PDF de backup (idêntico ao Relatório Executivo) e decidem como resolver conflitos campo a campo.

## 1. Detecção de mudança em modelo

Para cada tabela de modelo (`field_meeting_templates`, `meeting_talk_templates`, `checklist_templates`, `elder_program_templates`, e suas tabelas filhas) adicionar uma server function `applyTemplateUpdate` chamada após qualquer save do superintendente. Essa fn:

1. Localiza todas as `visits` futuras (start_date >= hoje) da congregação do modelo.
2. Para cada visita, lê o snapshot atual dos campos derivados do modelo e o novo conteúdo do modelo.
3. Compara campo a campo, classificando cada um como:
   - `unchanged` — sem diferença
   - `template_only` — só o modelo mudou, ancião não tocou → aplica automaticamente, sem perguntar
   - `conflict` — ancião já preencheu valor diferente do snapshot anterior → registra como pendência

4. Insere uma linha em nova tabela `visit_pending_updates` por visita afetada, com o JSON de diffs e timestamp.

## 2. Snapshot por visita

Nova coluna `template_snapshot jsonb` em `visits` (ou tabela `visit_template_snapshots` 1:1) com o conteúdo do modelo no momento em que a visita foi criada/aplicada. Necessário para distinguir "ancião editou" de "modelo mudou".

Atualizado em: criação de visita, aplicação de modelo, e quando o ancião confirma uma atualização.

## 3. Tabela `visit_pending_updates`

```
id, visit_id, template_type, template_id,
diff jsonb,           -- { autoApplied: [...], conflicts: [{field, oldTemplate, newTemplate, elderValue, label}] }
backup_pdf_url text,  -- gerado em Storage privado
created_at, resolved_at, resolved_by
```

RLS: anciãos da congregação leem/atualizam; superintendente lê tudo da sua congregação.

## 4. PDF de backup

Logo após inserir `visit_pending_updates`, gerar PDF idêntico ao Relatório Executivo do dashboard (reaproveitar `VisitWeekReportDialog` + `pdf-utils`) num server fn que:
- monta o jsPDF no servidor (jspdf roda em Worker)
- salva em bucket `visit-backups` (privado) com path `{visit_id}/{timestamp}.pdf`
- grava URL assinada de 7 dias em `backup_pdf_url`

Cron `pg_cron` diário às 04:00 deleta PDFs e linhas `visit_pending_updates` resolvidas/expiradas quando `visits.start_date <= CURRENT_DATE` (visita iniciou na terça).

## 5. UI — Diálogo de conflito para os anciãos

Novo `TemplateUpdateAlertDialog` exibido no `_app/dashboard` quando houver `visit_pending_updates` não resolvidos para a congregação:

- Card amigável: "O superintendente atualizou o modelo desta visita."
- Lista os campos afetados, destacando os que os anciãos **já preencheram** (com badge "Você editou").
- Para cada conflito, dois radios:
  - **Manter preenchimento dos anciãos** (padrão)
  - Aplicar valor novo do modelo
- Botão grande "Baixar PDF de backup" (download direto).
- "Confirmar atualização" aplica as escolhas, regrava snapshot, marca `resolved_at`.

Campos sem conflito (auto-aplicados) aparecem em seção colapsada "Atualizado automaticamente".

## 6. Notificação aos anciãos cadastrados

- Toast persistente no dashboard quando `visit_pending_updates` pendente existir.
- Badge vermelho no item de menu da semana da visita.
- Opcional: enviar email via `couple_messages`-like channel — fora deste escopo.

## 7. Hooks no fluxo do superintendente

Após salvar qualquer modelo (`field_meeting_templates` etc.) chamar a nova fn `propagateTemplateUpdate({ templateId, templateType })`. Mudanças em tabelas filhas disparam pela tabela mãe (debounce 2s no client para evitar uma chamada por linha).

## 8. Migrações necessárias

1. `visits.template_snapshot jsonb` (ou tabela dedicada)
2. `visit_pending_updates` + GRANT + RLS + trigger updated_at
3. Bucket `visit-backups` (privado) + policies
4. pg_cron job de limpeza diária

## Detalhes técnicos

- Server fns ficam em `src/lib/template-propagation.functions.ts` e `src/lib/visit-backups.functions.ts`.
- Componentes: `src/components/TemplateUpdateAlertDialog.tsx`, `src/components/PendingUpdatesBadge.tsx`.
- jsPDF no servidor: importar dinamicamente dentro do `.handler()` para evitar bundle no client.
- Diff helper: `src/lib/template-diff.ts` com funções por tipo de modelo.
- Sem alteração nos PDFs do Relatório Executivo já entregues — apenas reaproveitamos a montagem.

## Riscos e mitigação

- **Volume de PDFs**: limpeza diária + Storage privado.
- **Propagação em massa**: processa visitas em batch (10 por vez) dentro da server fn; modelos com muitas congregações não travam UI.
- **Conflito de escrita simultânea**: snapshot por visita evita sobrescrita acidental; diff sempre comparado contra snapshot, não contra valor anterior do ancião.
- **Visitas em andamento (terça em diante)**: não recebem propagação automática (filtro `start_date > hoje`).

## Entrega faseada

Se preferir PRs menores, podemos dividir em:
- **Fase A**: migrações + snapshot + propagação automática (sem PDF, sem diálogo) — campos sem conflito atualizam sozinhos.
- **Fase B**: diálogo de conflito + badge de notificação.
- **Fase C**: PDF de backup + cron de limpeza.

Aprovação para tudo de uma vez, ou prefere começar pela Fase A?
