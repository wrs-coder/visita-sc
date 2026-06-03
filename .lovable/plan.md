## Objetivo

Adicionar um botão **"Sincronizar com Reuniões e Discursos → Campo"** dentro do editor de nota da pasta fixa **"Considerações da semana"** (Esboços Pessoais → Considerações de Campo). O botão puxa, sob demanda, os 3 campos correspondentes do `field_meeting` da **visita ativa** que case por `event_date + period`.

## Comportamento

1. O botão aparece **apenas** quando:
   - A nota está dentro da pasta fixa `FIXED_FOLDER_WEEK_CONSIDERATIONS`.
   - `draft.event_date` e `draft.period` estão preenchidos.
   - Existe uma `visita ativa` para a congregação do utilizador.

2. Ao clicar:
   - Busca em `field_meetings` o registo com `visit_id = visitaAtiva.id`, `event_date = draft.event_date`, `period = draft.period`, `is_active = true`.
   - Se encontrar, preenche:
     - `territory` ← `"S-13 nº {territory_number} — {territory_location}"` (omite as partes vazias com elegância: se só tiver número → `"S-13 nº 42"`; se só localização → `"Centro"`; se modalidade ≠ `casa_em_casa` ou ambos vazios → não toca no campo).
     - `assistants` ← `auxiliary_leaders ?? ""`.
     - `prayer` ← `closing_prayer ?? ""`.
   - Sobrescreve os 3 campos (o utilizador escolheu "Sincronizar agora" como gatilho explícito).
   - Mostra `toast.success` com o resumo; se não houver match, `toast.info("Nenhuma reunião de campo encontrada para {data} · {turno}")`.

3. Os campos **continuam totalmente editáveis** — sem lock. O botão é o único ponto de sincronização.

4. Estado visual: pequeno hint abaixo do botão dizendo "Última sincronização: {hora}" se já tiver sido usado nessa sessão (estado local do editor, não persistido).

## Escopo da mudança (frontend apenas)

Um único ficheiro: `src/routes/_app.consideracoes-campo.tsx`.

- Importar `useActiveVisit` (`@/hooks/use-active-visit`) e `supabase`.
- Dentro do componente do editor de nota (onde já vivem `draft`, `onPatch`, e os campos `prayer/territory/assistants`), adicionar:
  - Hook `useActiveVisit()` para obter `visit.id`.
  - Função `handleSyncFromField()` que executa a query e chama `onPatch` 3x.
  - Renderizar o botão imediatamente acima da grelha dos campos "Oração final / Território / Dirigentes", com `variant="outline"` e ícone `RefreshCw` (lucide), só visível quando as 3 condições acima forem verdadeiras.
- Adicionar 3 chaves i18n em `pt.json`, `en.json`, `es.json`:
  - `fieldConsiderations.syncFromField.button`
  - `fieldConsiderations.syncFromField.success`
  - `fieldConsiderations.syncFromField.empty`

## O que **não** muda

- Sem alteração de schema (`field_meetings` e `personal_outlines` já têm tudo).
- Sem RLS nova — `field_meetings` já é legível por membros da congregação.
- Sem alteração no fluxo de sincronização cloud↔local de notas (`use-outlines-sync`); os campos sincronizados são tratados como qualquer outro conteúdo editado.
- Sem alteração na aba "Reuniões e Discursos → Campo" — fonte da verdade permanece intocada.
- Sem alteração no modo guest/snapshot.

## Detalhes técnicos

- Query:
  ```ts
  supabase.from("field_meetings")
    .select("territory_number,territory_location,auxiliary_leaders,closing_prayer,modality")
    .eq("visit_id", visit.id)
    .eq("event_date", draft.event_date)
    .eq("period", draft.period)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  ```
- Em modo offline (`isOfflineMode()`), o botão fica desabilitado com tooltip "Disponível apenas online" (a tabela `field_meetings` não é pré-cacheada no shell offline para esta tela).
- Composição do território:
  ```ts
  const parts = [];
  if (territory_number?.trim()) parts.push(`S-13 nº ${territory_number.trim()}`);
  if (territory_location?.trim()) parts.push(territory_location.trim());
  const territory = parts.join(" — ");
  ```

## Validação após implementar

1. Criar nota dentro de "Considerações da semana" com data/turno coincidentes com um `field_meeting` existente → clicar botão → 3 campos preenchidos com formato correto.
2. Apagar valores na nota, alterar `territory_number` na origem, sincronizar novamente → reflete o novo valor.
3. Nota sem data ou turno → botão escondido.
4. Data/turno sem `field_meeting` correspondente → toast "nenhuma reunião encontrada".
5. Confirmar build limpo.