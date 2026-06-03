## Plano

### 1) Estudos e Revisitas — eventos omitidos quando coincide dia + hora

**Causa raiz (encontrada):** em `src/lib/templates.functions.ts`, a função `applyTemplateToVisit` deduplica itens de `kind: "study"` usando a chave `event_date|period` (Manhã/Tarde). Como `period` só tem 2 valores, dois eventos no **mesmo dia e mesmo período** colidem — o segundo cai no ramo `skipped++` e nunca é inserido em `field_assignments`. Para os anciãos, isso parece "omitido" mesmo após editar o modelo, porque o merge não-destrutivo continua ignorando o segundo item enquanto já existe uma linha do primeiro naquele dia/período.

Linhas relevantes (templates.functions.ts):
```text
141  const fieldKey = (date, period) => `${date}|${period ?? "Manhã"}`;
154  if (it.kind === "study") {
155    const periodVal = str(p.period) ?? "Manhã";
156    const key = fieldKey(targetDate, periodVal);
157    if (fieldDates.has(key)) { skipped++; continue; }   // <-- segundo evento é descartado
```

**Correção:** trocar a chave de dedupe por uma assinatura de conteúdo (mesmo padrão usado em `applyElderProgramTemplateToVisit`):

- Nova `fieldKey = date|period|meeting_time|meeting_point|acompanhante|acompanhante_for`.
- Pré-carregar essas colunas em `exField` (`select("event_date,period,meeting_time,meeting_point,acompanhante,acompanhante_for")`).
- Só pula (`skipped++`) quando existir linha com **mesma assinatura completa**; caso contrário, insere normalmente.
- Não altera o comportamento de "não sobrescrever dados manuais" — apenas deixa de bloquear segundo evento no mesmo dia/período.

Também adicionar `router.invalidate()` / `queryClient.invalidateQueries(["field_assignments"])` no chamador do `applyTemplateToVisit` para garantir refresh imediato na aba dos anciãos (já feito hoje, só validar).

Sem migração de banco. Os 2 usuários afetados precisarão **reaplicar o modelo** (ou criar o evento manualmente uma vez) — itens que já foram descartados no passado não voltam sozinhos.

### 2) Dashboard — cartão "Reunião de Campo": exibir tudo

Hoje, em `src/routes/_app.dashboard.tsx` (linhas 1085–1128), o cartão já renderiza `meeting_location`, `territory_number`, `territory_location`, `auxiliary_leaders` e `closing_prayer`, **mas todos condicionados a valor truthy** e **`observations` não é exibido** (é apenas carregado).

**Mudanças:**
- Adicionar bloco de **observações** (`f.observations`) ao cartão, com `whitespace-pre-wrap`.
- Garantir que `territory_number`, `territory_location` e `auxiliary_leaders` sigam aparecendo (já aparecem; manter rótulos `i18n` consistentes).
- Replicar exatamente o mesmo conjunto de campos no `DayDetailsDialog` ("Ver detalhes do dia"), linhas 1419–1438, para incluir `observations` lá também.
- Sem alteração nos selects do Supabase (todas as colunas já vêm na query da linha 475).

### Arquivos afetados

- `src/lib/templates.functions.ts` — nova chave de dedupe para `study`.
- `src/routes/_app.dashboard.tsx` — adicionar `observations` no cartão "Reunião de Campo" e no diálogo de detalhes.

Sem mudanças de banco, sem mudanças em RLS, sem novos endpoints.
