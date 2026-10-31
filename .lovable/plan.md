# Correção: rótulo "INFORMAÇÕES PARA VOCÊ" sobreposto na caixa da carta

## O que acontece
Na caixa do convite, cada linha tem uma coluna fixa e estreita para o rótulo, de cerca de 2,6 cm, e o texto começa logo depois dela. Rótulos curtos (LOCAL, TEMA) cabem nesse espaço. Rótulos longos não cabem e invadem o texto:
- "INFORMAÇÕES PARA VOCÊ" passa por cima das primeiras palavras.
- "PRÓXIMO ORADOR" e "SUA DESIGNAÇÃO" encostam no texto.

Observação: a imagem mostra a fonte reserva (Times), e não a fonte da carta (Lora). Isso indica que as fontes da carta não carregaram nesse aparelho. Vou verificar também.

## Solução recomendada
A coluna do rótulo passa a se ajustar ao conteúdo:
1. A coluna fica com a largura do maior rótulo curto, com limite de cerca de 3,5 cm.
2. Um rótulo que passa desse limite (por exemplo, "INFORMAÇÕES PARA VOCÊ") fica em uma linha própria. O texto vem logo abaixo, ocupando toda a largura da caixa.
3. A altura da caixa é calculada com essas mesmas regras, para nada sair da borda.

```text
┌ Assembleia de Circuito 2027 — sáb 07/11 ─┐
│ LOCAL            SAV                     │
│ ORADOR           bb — bbbbb              │
│ SUA DESIGNAÇÃO   Parte Nº 1 · 10:00 · 14m│
│ TEMA             "Encontre a mais..."    │
│ INFORMAÇÕES PARA VOCÊ                    │
│ Não é necessário ler ou comentar todos os│
│ textos citados... (th p. 23)             │
│ PRÓXIMO ORADOR   cccc — cccc             │
│   Para aceitar ou recusar: [Clique aqui!]│
└──────────────────────────────────────────┘
```

## Fonte reserva
Se as fontes da carta não carregarem, o app tenta de novo antes de gerar as cartas. Elas também serão guardadas para uso sem internet. Se ainda assim falharem, a carta sai com a fonte reserva, mas com o mesmo alinhamento.

## Detalhes técnicos
- `letter-render.ts` (quadro): medir os rótulos com `widthOfTextAtSize`. `LABW = min(max(rótulos ≤ 100pt) + 10, 100)`. Rótulos acima de 100pt viram linha "stacked": rótulo com altura de 11pt e valor com largura total. A altura do quadro é calculada pelas mesmas linhas.
- Teste: um rótulo longo não sobrepõe o texto (o x do valor fica maior ou igual à largura do rótulo, ou o rótulo fica em linha própria), e a carta continua em 1 página.
- Conferir `loadLetterFonts` (caminho `/fonts/letter` no app Android) e incluir as fontes no aquecimento para uso sem internet.
