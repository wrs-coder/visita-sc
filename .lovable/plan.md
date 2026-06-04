# Plano — Missões 1 e 2

## Missão 1 — Território no cartão "Reunião de Campo"

**Diagnóstico.** O dashboard (`src/routes/_app.dashboard.tsx`, ~L1096–1142) já busca e renderiza `territory_number` / `territory_location`, mas só são exibidos quando `territory_number` é truthy. A raiz do problema está no `FieldMeetingsPanel.tsx` (`showTerritory = r.modality === "casa_em_casa"`): os campos de território só aparecem para edição quando a modalidade é "Casa em Casa". Em modalidades como Cartas, Telefone, Testemunho Público, Revisitas ou Estudos, o ancião não consegue preencher S-13 nem localização, então não há valor para o dashboard mostrar. Quando o modelo (template) é propagado com outra modalidade, os campos do território vêm vazios da visita.

**Ações.**

1. Em `src/components/meetings/FieldMeetingsPanel.tsx`:
   - Remover a condicional `showTerritory`. Os campos "Nº do território (S-13)" e "Localização do território" passam a aparecer sempre (independente da modalidade), inclusive em modo somente-leitura para o ancião quando aplicável.
   - "Designações auxiliares" continua sob a mesma seção visual.
2. Em `src/routes/_app.dashboard.tsx` (cartão "Reunião de Campo", ~L1119 e o popup de detalhes em ~L1441):
   - Exibir a linha de território quando **`territory_number` OU `territory_location`** for preenchido (hoje só verifica `territory_number`). Texto: `Território {nº ou "—"} · {localização}` quando ambos existirem, ou apenas o que existir.
3. Sem mudanças de schema/migração: a coluna já existe e o template já propaga.

## Missão 2 — Novo cartão "Pastoreiem o Rebanho de Deus"

Replicar a anatomia do cartão **"Esboços e Notas"** (`CollapsibleCard` com `Tabs` lado a lado e rolagem vertical de ~18rem), trazendo as 4 seções de `programa-ancioes`:

- VISITAS DE PASTOREIO
- ENCORAJAMENTO
- RECOMENDAÇÕES
- ASSUNTOS LOCAIS

**Ações.**

1. **Backend (reaproveitar).** Usar `listElderProgramForVisit` (já existe em `src/lib/elder-program.functions.ts`) chamado via `useServerFn` na entrada do dashboard quando `visit?.id` existir e `role === "superintendent"`. Carregamento único + reload em mudança de visita. Sem novas queries diretas (RLS já cobre).
2. **UI (`src/routes/_app.dashboard.tsx`).** Novo `CollapsibleCard` (id `super-elder-program`) com ícone `Heart` (já importado) e:
   - `Tabs` com 4 `TabsTrigger` (Pastoreio, Encorajamento, Recomendações, Locais) em `grid grid-cols-4` (mesma estética do card de Esboços, com `whitespace-normal break-words text-[11px] sm:text-sm`).
   - Cada `TabsContent` mostra um `<ul>` com `overflow-y-auto pr-1` e `maxHeight: "min(18rem, 60vh)"`, com gradiente inferior quando há mais de 3 itens.
   - Cada item é um botão somente-leitura mostrando o campo mais relevante por seção (ex.: `family_name`/`slot_label` em pastoral, `person_name`+categoria em encorajamento, `full_name`+propósito em recomendações, `subject`/`suggested_by` em locais) + linha secundária com 1 detalhe (endereço/contato/info).
   - Cabeçalho do cartão (`headerRight`) com link "Ver tudo" → `/programa-ancioes`.
   - Estado vazio por aba: `"Nenhum item registrado."`.
3. **Posicionamento.** Inserir logo após o cartão "Esboços e Notas" (mantém agrupamento de cartões de superintendente).
4. **Visibilidade.** Renderizar apenas para `role === "superintendent"` com `visit` ativa, igual aos demais cartões do bloco.

## Detalhes técnicos

- Sem alterações de banco; nenhuma migração.
- Sem novos pacotes.
- Reaproveita componentes já no bundle (`CollapsibleCard`, `Tabs`, `Heart`, `ChevronRight`, `Link`).
- O carregamento de elder-program só ocorre para superintendente com visita ativa (custo zero para anciãos e fora de visita).
- Compatível com PWA/Browser/APK: usa o cliente Supabase existente; nenhuma API nova.

## Arquivos editados

- `src/components/meetings/FieldMeetingsPanel.tsx` — sempre exibir os 2 campos de território.
- `src/routes/_app.dashboard.tsx` — render condicional ampliada do território + novo `CollapsibleCard` "Pastoreiem o Rebanho de Deus".
