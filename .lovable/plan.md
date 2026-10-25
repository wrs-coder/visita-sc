# Selo de tempo flutuante e discreto (modo esboço e tela cheia)

## Causa
- **Modo esboço:** o quadro que envolve o esboço tem um corte de bordas ("overflow hidden"). Isso impede qualquer item de ficar preso no topo durante a rolagem da página. Na tela cheia esse corte não existe, por isso lá funcionou.
- **Atrapalhando o texto:** hoje o cabeçalho inteiro do tópico (título + fundo) fica preso no topo e cobre linhas do texto.

## O que muda
1. **Só a pílula do tempo acompanha a rolagem.** O título do tópico volta a rolar normalmente com o texto. Uma pequena pílula ("até 19:42" ou "+4 min") flutua no canto superior direito enquanto você estiver dentro daquele tópico. Ao passar para o próximo, a pílula do próximo assume.
2. **Visual mínimo:** pílula pequena, fundo quase transparente com leve desfoque, sem faixa nem borda larga, sem ocupar a linha do texto. A pílula do tópico atual mantém a cor de destaque suave. Os concluídos ficam apagados com visto.
3. **Tocar na pílula continua concluindo o tópico.** Isso funciona igual nos dois modos.
4. **Modo esboço:** o corte de bordas é trocado por um corte só lateral, que não bloqueia o "preso no topo". A aparência do quadro não muda.

## O que não muda
Banco, formato salvo, cronômetro, cálculo dos horários, recolher/expandir tópicos e o modo edição.

## Validação
- Conferir no navegador, em tela de celular (393px), nos modos esboço e tela cheia: rolar o texto e ver a pílula acompanhar sem cobrir o texto.
- `bunx tsgo --noEmit` e `bunx vitest run`.

## Detalhes técnicos
- `OutlineTopicBlock.tsx`: remover `sticky`/fundo do cabeçalho. O selo some do cabeçalho e passa para uma linha de altura zero no topo do `section`: `sticky top-2 z-10 h-0 flex justify-end pointer-events-none`. A pílula fica dentro, com `pointer-events-auto -translate-y-1/2`, e só aparece quando o tópico tem tempo.
- `TopicTiming.tsx`: variante `floating` do `TopicTimeBadge`, com `text-[10px] px-1.5 py-0 bg-background/60 backdrop-blur-sm border-transparent` e as cores do estado atual/concluído mantidas por tokens.
- `_app.consideracoes-campo.tsx` (linha ~1937): no `Card` do editor, trocar `overflow-hidden` por `overflow-x-clip`. `clip` não cria contêiner de rolagem, então o `sticky` volta a funcionar. O efeito visual é o mesmo.
