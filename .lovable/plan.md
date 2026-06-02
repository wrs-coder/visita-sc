# Corrigir seletor "Congregação ativa" no Dashboard

## Diagnóstico

O efeito de auto-seleção em `src/routes/_app.dashboard.tsx` (linhas 377–406) sempre chama `setActiveCongregationOverride(match)` — inclusive quando `match` é `null` (nenhuma visita na semana vigente). Isso apaga o override global usado por todas as outras telas (`useActiveCongregation`), quebrando a "Congregação ativa" como conceito global.

O recurso "Ver dia seguinte" (`dayOffset` / `viewedIso`) hoje não toca em `selected` nem no override — vamos garantir explicitamente que continue assim.

## Mudanças (apenas `src/routes/_app.dashboard.tsx`)

1. **Auto-seleção da semana vigente (efeito linhas 377–406)**
   - Continua rodando ao montar o Dashboard.
   - A consulta já usa **sobreposição com a semana inteira** (`start_date ≤ fim_da_semana AND end_date ≥ início_da_semana`, segunda→domingo). Isso garante que, já na segunda-feira, o seletor aponte a congregação cuja visita só começa, por exemplo, na terça — comportamento que o usuário pediu. Vamos preservar essa consulta.
   - Ajustar a escolha do `match`: priorizar a visita que **cobre o dia de hoje**; se nenhuma cobre hoje, escolher a visita da semana com **menor `start_date`** (a próxima a começar). Isso cobre o caso "hoje é segunda, a visita começa terça".
   - Quando encontra visita na semana (`match` ≠ null): `setSelected(match)` + `setActiveCongregationOverride(match)`.
   - Quando **não** encontra (`match === null`):
     - **Não** chama `setActiveCongregationOverride(null)` (preserva o override global existente para outras telas).
     - Usa `getActiveCongregationOverride()` como `selected`; se também não houver, mantém `selected = null` ("Sem visita").

2. **Seleção manual (`handleSelectCong`)**
   - Mantém comportamento atual: `setSelected` + `setActiveCongregationOverride` propagam globalmente. A escolha vale até a próxima montagem do Dashboard, conforme solicitado.

3. **Isolamento do "Ver dia seguinte"**
   - Confirmar (com comentário) que o botão só altera `dayOffset` e não toca em `selected`, no override nem nas deps do efeito de auto-seleção (que permanecem `[role, user, today]`).

## Fora de escopo

- Nenhuma mudança em `useActiveCongregation`, `useActiveVisit`, RLS, banco ou outras rotas.
- Nenhum ajuste visual nos cartões; popups e traduções já corrigidos permanecem como estão.

## Como validar

- **Segunda-feira, visita começa terça** → seletor já mostra a congregação dessa visita; outras telas refletem a mesma.
- Semana com visita cobrindo hoje → seletor mostra essa congregação.
- Trocar manualmente → propaga a todas as telas; ao reabrir o Dashboard, volta para a congregação da semana vigente.
- Sem visita na semana → seletor mostra "Sem visita", mas a "Congregação ativa" global anterior permanece nas outras telas.
- Clicar "Ver dia seguinte" / "Voltar para hoje" → seletor "Congregação ativa" não muda; só os 6 cartões diários trocam de dia.
