## Diagnóstico

A aba "Anciãos" do visitante (`getGuestSnapshot` em `src/lib/guest.functions.ts`) lê eventos apenas das tabelas por‑visita:

- `elder_pastoral_visits`, `elder_encouragements`, `elder_recommendations`, `elder_local_matters` (filtrando por `visit_id`)
- `elder_program_visit_sections` (observações) e `elder_program_visit_slots`

As observações aparecem porque, ao criar/abrir a visita, as linhas em `elder_program_visit_sections` são criadas (mesmo vazias) e qualquer texto digitado pelo ancião coordenador é gravado lá com `visit_id`.

Os eventos (Pastoreio, Encorajamento, Recomendações, Assuntos Locais), porém, em muitos casos só existem em `elder_program_template_events` (vinculados ao `template_id`) e não foram materializados nas tabelas por‑visita. Isso acontece quando:

- O modelo foi editado/preenchido após a visita ter sido criada, e
- O superintendente ainda não rodou `applyElderProgramTemplateToVisit` para essa visita.

Como o coordenador edita pela rota `/programa-ancioes` (que também lê apenas tabelas por‑visita), ele acredita que "salvou" — mas, se o trabalho real está no modelo (`/modelo-programacao-ancioes`), o visitante vê só observações + "Nenhum evento".

Confirmado em produção: existem visitas ativas com `tpl_evts > 0` mas `visit_past/enc/rec/loc = 0` (ex.: visita `cf56c553...`).

## Objetivo

Garantir que o visitante (Corpo de Anciãos / ESC) veja sempre o conteúdo mais completo de Pastoreios, sem alterar o fluxo de edição do superintendente nem o modelo de dados.

## Plano (somente leitura no servidor do convidado)

Edição cirúrgica em `src/lib/guest.functions.ts`, dentro do bloco `if (!wifeMode) { ... }` que monta `elderProgram`:

1. Após buscar os eventos por‑visita, calcular `visitEventsTotal = pastoral.length + encouragement.length + recommendations.length + local.length`.
2. Se `visitEventsTotal === 0` E `visit.elder_program_template_id` estiver preenchido, fazer um segundo `Promise.all` lendo, do template, apenas em modo leitura:
   - `elder_program_template_sections` (section, additional_info)
   - `elder_program_template_slots` (id, label, sort_order)
   - `elder_program_template_events` (todos os campos compartilhados, com a coluna `section` para separar)
3. Mapear os eventos do template para o mesmo shape `ElderEventRow` já usado pelo cliente (campos compartilhados; faltantes ficam `null`; `source = "template"` quando a coluna não existir no template).
4. Mesclar com prioridade: se uma seção (`pastoral`/`encouragement`/`recommendations`/`local`) estiver vazia na visita, usar a lista do template; do contrário, manter a da visita. Mesma lógica para `slots` e `sections` (somente preencher a chave quando a visita estiver vazia/`""`).
5. Não alterar o filtro de modo (continua dentro de `if (!wifeMode)`), não tocar em RLS, não tocar em `elder-program.functions.ts`, e não propagar nada para o banco. É exclusivamente um fallback de leitura no snapshot do convidado.

## Segurança e integridade

- Continua usando `supabaseAdmin` apenas dentro do `createServerFn` do guest, atrás do `inviteCode` já validado.
- O fallback só dispara para a visita já resolvida e somente para o `template_id` que está em `visits.elder_program_template_id` da congregação correta — sem expor templates de outros superintendentes.
- O painel do convidado continua respeitando o gate de senha (`ElderTabGate` / `isElderUnlocked`) tanto na exibição quanto na exportação (WhatsApp/PNG/PDF). A exportação volta a incluir eventos automaticamente porque consome `snap.elderProgram` já enriquecido.
- Nenhuma migração SQL, nenhuma policy nova, nenhuma alteração em tabelas, secrets ou edge functions.
- `bunx tsc --noEmit` deve continuar limpo (somente código TypeScript em um arquivo já existente).

## Validação

1. Visita com eventos por‑visita (`dd384ed7...`): comportamento inalterado, eventos da visita aparecem.
2. Visita sem eventos por‑visita mas com `elder_program_template_id` populado (`cf56c553...` quando o template tiver eventos): visitante passa a ver os eventos do template.
3. Visita sem template e sem eventos: continua mostrando "Nenhum evento" (esperado).
4. Modo esposa (`*` no código): aba Anciãos continua oculta.

## Necessidade de novo APK

Não. A mudança é exclusivamente em código de servidor TypeScript carregado pelo build web (Cloudflare Worker). O APK Capacitor consome o mesmo bundle web servido pela Lovable, portanto basta publicar — não há alteração em `AndroidManifest`, `capacitor.config.ts`, `versionCode`/`versionName` ou permissões nativas.
