# Recolher e expandir nas abas da visita

## Onde a setinha vai aparecer
| Aba | O que recolhe |
|---|---|
| Reuniões e Discursos > Campo | Cada dia e cada reunião de campo |
| Estudos e Revisitas | Cada dia e cada turno/evento |
| Pastoreios, Recomendações e outros | Cada seção (Pastoreios, Encorajamento, Recomendações, Assuntos locais) e cada evento |
| Refeições | Cada dia (com aviso do dia e refeições) |
| Transporte | Cada dia/grupo e cada trajeto |

## Como vai funcionar
- Setinha à direita do título de cada dia/seção/evento. Tocar recolhe (fica só o título) ou expande.
- Evento recolhido mostra uma linha curta: horário + título/tipo, para identificá-lo sem abrir.
- No topo de cada aba: botão "Recolher tudo / Expandir tudo".
- Por padrão tudo vem aberto, como hoje. A escolha fica salva **só neste aparelho**, por usuário e visita (não vai para o servidor, não afeta outros usuários).
- Vale para superintendente e anciãos. Se houver campos sendo editados, recolher não apaga nada: o rascunho e o botão "Salvar dados" continuam iguais.
- Itens novos adicionados aparecem já abertos.

## O que não muda
Dados, banco de dados, permissões, rascunhos automáticos, modelos, relatórios/PDFs, resumo da semana, login e abertura do app.

## Detalhes técnicos
- Novo hook `src/hooks/use-collapsible-state.ts` (localStorage `visita-sc:collapse:v1:{userId}:{visitId}:{scope}`; `isOpen(id)`, `toggle(id)`, `setAll(ids, open)`), leitura em `useEffect` para evitar hydration mismatch.
- Novo componente `src/components/ui/collapse-toggle.tsx` (botão chevron com `aria-expanded`, tokens do tema) e `CollapseAllButton`.
- Conteúdo recolhido: não renderizado via `Collapsible` do shadcn (`forceMount` onde houver formulário com estado local, escondendo com `hidden`, para não perder digitação).
- Arquivos: `FieldMeetingsPanel.tsx`, `_app.escala.tsx`, `_app.programa-ancioes.tsx` (seções + `EventCard`), `_app.refeicoes.tsx` (seções por dia + `MealCard`), `_app.transporte.tsx` (grupos + linhas).
- Traduções pt/en/es (`collapse.expand`, `collapse.collapse`, `collapse.all`, `expand.all`).
- Registrar decisão em `AGENTS.md`; validar `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px.

## Riscos e como serão evitados
- **Perder o que está sendo digitado ao recolher** (médio): o conteúdo recolhido fica só escondido na tela, sem ser descartado, então o rascunho é mantido.
- **Botões de salvar, adicionar ou excluir ficarem inacessíveis** (baixo): ficam no título ou aparecem ao expandir; "Expandir tudo" sempre fica disponível.
- **Tela errada logo ao abrir** (baixo): a preferência salva só é lida depois que a página aparece; até lá, tudo vem aberto.
- **Preferência salva corrompida** (baixo): se não der para ler, o app ignora e mostra tudo aberto, sem travar.
- **Abertura do app, login, dados, servidor, relatórios e modo offline**: sem risco, porque não são alterados.
- **Impacto no visual**: só aparece uma setinha a mais em cada título. Antes de concluir, vou conferir na tela do celular cada uma das 5 abas.
