# Recolher e expandir em todos os acessos

## Resposta curta
- **É possível?** Sim, nos cartões e eventos. As abas e subabas em si não fazem sentido recolher (são os botões de navegação); o que recolhe é o conteúdo dentro delas, com um botão "Recolher tudo / Expandir tudo" no topo de cada aba.
- **É vantajoso?** Sim no celular: listas longas (refeições, transporte, campo, estudos) ficam curtas e a pessoa abre só o que precisa. No "Hoje" o ganho é menor, então lá tudo continua aberto por padrão.
- **Riscos:** baixos, porque é só visual (nada muda em dados, banco, login ou modo offline). Os principais: mais um toque para ver informação escondida; alguém pensar que "sumiu" algo recolhido; telas ficarem visualmente inconsistentes se feito pela metade.

## Situação atual
Já têm recolher/expandir: painel do superintendente (cartões), Estudos, Refeições, Transporte, Reuniões de Campo, Pastoreio e os Modelos.
Ainda não têm: painel por código da **esposa** e dos **anciãos** (cerca de 25 cartões), espaço pessoal da esposa (Leitura da Bíblia/Pesquisas) e algumas abas do superintendente (Reuniões e Discursos, Checklist, Cronograma, Comunicação do casal).

## O que vou fazer
1. **Painel da esposa e dos anciãos:** cada cartão ganha a setinha no título; em cada aba, botão "Recolher tudo / Expandir tudo". Eventos de cada dia (refeição, trajeto, saída de campo, reunião) recolhem mostrando uma linha curta "horário · título".
2. **Abas do superintendente que faltam:** mesma setinha nos cartões e eventos de Reuniões e Discursos, Checklist, Cronograma e Comunicação do casal.
3. **Regras iguais para todos:**
   - Tudo começa aberto, como hoje.
   - A escolha fica salva só neste aparelho, separada por pessoa/código.
   - Recolher nunca apaga o que está sendo digitado.
   - Funciona também em "somente visualização" e sem internet.
4. **Fica de fora:** a faixa de dias e o resumo do "Hoje", o login e os editores de esboço (que já têm tópicos recolhíveis).

## Detalhes técnicos
- Reutilizar `CollapsibleCard` (cartões) e `collapsible-blocks.tsx` (`CollapseProvider`, `CollapseItem`, `CollapseAllButton`) já existentes; nada novo de estado.
- `visitante.painel.tsx`: trocar `<Card>` por `CollapsibleCard` com ids `guest:<hash do código>:<cartão>`; `CollapseProvider` por aba com escopo `guest-<aba>`.
- Abas do superintendente: `_app.reunioes-discursos.tsx`, `_app.checklist.tsx`, `_app.cronograma.tsx`, `_app.comunicacao-casal.tsx`.
- Conteúdo recolhido escondido, não desmontado, onde houver formulário.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px no painel da esposa.
- Sugestão econômica: fazer em duas rodadas — (1) painel da esposa e anciãos; (2) abas restantes do superintendente.
