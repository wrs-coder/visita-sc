## Objetivo

Dois ajustes no Dashboard (`src/routes/_app.dashboard.tsx`), sem mexer em backend nem alterar lógicas existentes.

---

### Ajuste 01 — Popups completos nos cartões

Hoje os popups de "Reunião de Campo", "Estudos e Revisitas" e "Refeições" já trazem boa parte das informações, mas faltam campos. "Reuniões de hoje" e "Transporte" estão bem incompletos. O cartão "Checklist da Congregação" não é alterado.

**Reunião de Campo (`field_meetings`)** — ampliar select para incluir `observations` e exibir esse campo no popup (cartão compacto permanece igual).

**Estudos e Revisitas (`field_assignments`)** — popup atual já cobre todos os campos da tabela. Nada a adicionar.

**Refeições de hoje (`meals`)** — popup atual já cobre todos os campos. Nada a adicionar.

**Reuniões de hoje** — ampliar a busca em `useEffect` (linhas 526-551) e o popup:
- `midweek_meetings`: adicionar `chairman`, `closing_prayer`.
- `weekend_meetings`: já busca `talk_theme_title` e `public_talk_theme`; exibir ambos.
- `pioneer_meetings`: adicionar `opening_prayer`, `closing_prayer`.
- `elders_servants_meetings` não tem data/hora própria, então fica fora do filtro por dia (documentado em comentário).
- Expandir o tipo `MeetingTodayItem` para incluir os campos opcionais (`chairman`, `opening_prayer`, `closing_prayer`, `public_talk_theme`) e renderizar todos no `DayDetailsDialog` correspondente. Rótulos via `t()` reaproveitando `dashboard.closingPrayer` e novas chaves `dashboard.openingPrayer`, `dashboard.chairman` com `defaultValue`.

**Transporte de hoje (`transport_schedule`)** — ampliar select (linhas 432-437) para incluir `event_type, direction, departure_time, return_time, all_day`. Expandir `interface Transport` e o conteúdo do `DayDetailsDialog` de transporte para mostrar tipo, direção, horários ida/volta, flag "dia inteiro" e os campos já presentes (motorista, telefone, descrição, observações). O cartão compacto permanece igual; só o popup expande.

---

### Ajuste 02 — Botão "Ver dia seguinte"

Adicionar um controle de data no Dashboard que alterna entre **hoje** e **amanhã**, atualizando 6 cartões:

- "Hoje no cronograma" (super, `circuitToday`)
- "Reunião de Campo" (`fieldMeetings`)
- "Estudos e Revisitas" (`assignments`)
- "Refeições" (`meals`)
- "Reuniões de hoje" (`meetingsToday` — recalculada pelo dia-da-semana da data selecionada)
- **"Transporte" (`transports`)** — também troca para a data selecionada

Os demais (Checklist, Esboços e Notas, Recados da esposa, alerta de visitas vencidas) **não** mudam — continuam atrelados a hoje / estado global.

**UI:**
- Botão pequeno ao lado da data no header, tipo `Button` outline com ícones `ChevronLeft`/`ChevronRight`.
- Estado: `const [dayOffset, setDayOffset] = useState<0 | 1>(0)`.
- Exibe rótulo: "Hoje" ou "Amanhã · 03/06/2026".
- Botão de voltar aparece somente quando `dayOffset === 1`.
- Quando offset = 1, os 6 cartões mostram um chip discreto "Amanhã" ao lado do título para evitar confusão; popups usam a data efetiva no título.

**Comportamento dos dados:**
- Derivar `viewedDate = addDays(new Date(), dayOffset)` e `viewedIso = format(viewedDate, "yyyy-MM-dd")`.
- Substituir `today` por `viewedIso` nas queries dos 6 cartões (`circuit_schedule_events`, `meals`, `transport_schedule`, `field_assignments`, `field_meetings`) e nos canais realtime correspondentes.
- Para `meetingsToday`, usar `viewedDate.getDay()` em vez de `new Date().getDay()`.
- Manter `today` separadamente para o restante (visitas vencidas, label do cabeçalho, etc.).
- Incluir `viewedIso` na dependência dos `useEffect` para refetch automático ao alternar.

**Out of scope:** sincronização, RLS, edição, lógica de seleção de congregação, esposa-mode. O modo offline continua funcionando normalmente porque usa as mesmas queries interceptadas.

---

### Arquivos afetados

- `src/routes/_app.dashboard.tsx` (única alteração)
- `src/i18n/locales/pt.json`, `en.json`, `es.json` — chaves novas com `defaultValue` inline (`dashboard.viewNextDay`, `dashboard.viewToday`, `dashboard.viewingTomorrow`, `dashboard.openingPrayer`, `dashboard.chairman`, `dashboard.transportType`, `dashboard.transportDirection`, `dashboard.transportDeparture`, `dashboard.transportReturn`, `dashboard.transportAllDay`).

### Fora do escopo
- Cartão "Esboços e Notas" e "Checklist" — não tocados.
- `VisitSummaryView` — não alterado nesta entrega.
- Sem mudanças em migrações, RLS, server functions ou edge functions.
