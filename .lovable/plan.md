## Problema
A aba "Anciãos" do painel **Resumo da Semana** do superintendente não mostra Pastoreios, Encorajamento, Recomendações nem Assuntos Locais — mesma raiz do bug que já corrigimos no painel do visitante.

Em `src/lib/visit-summary.functions.ts` (server fn `getSuperVisitSummary`) há um único `elderCols` com todas as colunas misturadas, usado para consultar 4 tabelas diferentes (`elder_pastoral_visits`, `elder_encouragements`, `elder_recommendations`, `elder_local_matters`). O PostgREST rejeita o select porque colunas não existem em todas as tabelas → retorna vazio.

## Correção
Aplicar no `getSuperVisitSummary` o mesmo padrão de projeções por tabela já usado em `src/lib/guest.functions.ts`:

- `pastoralCols` = `id,source,sort_order,slot_label,companion,family_name,address,family_members,spiritual_info`
- `encouragementCols` = `id,source,sort_order,category,person_name,address,contact,health_info,spiritual_info`
- `recommendationCols` = `id,source,sort_order,purpose,full_name,family_members,field_group,info`
- `localMatterCols` = `id,source,sort_order,suggested_by,subject,sources,info`

Substituir as 4 chamadas que hoje usam `elderCols` para cada uma usar sua projeção correta. O `mapRows` continua igual (campos ausentes viram `null`).

Sem mudança no front; o `ElderProgramReadOnly` já renderiza tudo assim que os arrays vierem populados.

## Validação
- `bunx tsc --noEmit` deve passar.
- Abrir Resumo da Semana → aba Anciãos: as 4 seções devem aparecer com o mesmo conteúdo visto pelos anciãos.
