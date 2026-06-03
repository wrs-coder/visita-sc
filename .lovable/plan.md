## Ajustes na aba "Pastoreios, Recomendações e outros"

### Ajuste 1 — Detecção de conflito de horário (Seção 01 "Visitas de Pastoreio")

Arquivo: `src/routes/_app.programa-ancioes.tsx`

- No card de evento da seção `pastoral`, calcular se `slot_label` já está em uso por outro evento da mesma lista `pastoral` (mesma visita).
- Quando houver conflito:
  - O `SelectTrigger` do campo "Dia/Horário" recebe estilo vermelho (`border-destructive text-destructive`) e um ícone/texto auxiliar abaixo: "Este horário já está em uso por outro evento."
- Quando o usuário **selecionar** um slot já usado por outro card, abrir um `AlertDialog` amigável:
  - Título: "Conflito de horário"
  - Descrição: "O horário '{slot}' já está atribuído a outra visita de pastoreio. Deseja confirmar mesmo assim?"
  - Botões: "Cancelar" e "Sim, confirmar".
  - **Sim** → aplica o slot normalmente (`onChange({ slot_label })`) e salva.
  - **Não/Cancelar** → reabrir o Select mostrando a lista de slots **excluindo os horários já usados** por outros cards (mantém o slot atual do próprio card e o "—" None).
- Implementação: estado local no `EventCard` `pastoral` controlando (a) se houve recusa de conflito → próxima abertura do Select filtra os ocupados; (b) controle do `AlertDialog` pendente com o valor escolhido.
- A lista de slots ocupados é passada do `Page` para cada `EventCard` via prop `usedSlots: Set<string>` (derivada de `pastoral.map(p => p.slot_label).filter(Boolean)` excluindo o próprio `ev.slot_label`).

Sem alterações de backend, RLS ou banco — apenas UX no cliente.

### Ajuste 2 — Renomear label "Finalidade" para "Recomendação para:"

Arquivo: `src/routes/_app.programa-ancioes.tsx`

- No bloco `ev.section === "recommendations"`, alterar o `<FieldRow label="Finalidade">` para `<FieldRow label="Recomendação para:">`.

### Detalhes técnicos

- Usar `AlertDialog` (já disponível em `@/components/ui/alert-dialog`).
- O filtro da lista após recusa é efêmero (estado local do card); ao recarregar a página, o comportamento de aviso de conflito volta ao normal.
- Nenhuma migração, nenhuma alteração em `elder-program.functions.ts`, nenhuma alteração no editor do superintendente.
