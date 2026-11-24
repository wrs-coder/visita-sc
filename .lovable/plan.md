# Analisador — 3 ajustes (sem tocar no VisitaSC)

Tudo fica só em `public/ferramentas/Analisador/` (app.js, analyzer.js, style.css) e testes em `ferramentas-testes/`. Nada do app VisitaSC é alterado.

## 01. Botão "✓ Aplicar mudanças" sem reação

O que foi visto no código: o botão recalcula, mas a marca "há mudanças" daquele cartão nunca é apagada. Por isso a faixa continua na tela e parece que nada aconteceu. Primeiro passo: confirmar no navegador simulado; depois corrigir.

```text
Antes do toque                     Depois do toque
┌──────────────────────────┐      ┌──────────────────────────┐
│ ● Há mudanças não        │      │ ✓ Mudanças aplicadas     │  (some em 2 s)
│   aplicadas  [✓ Aplicar] │  →   │                          │
└──────────────────────────┘      └──────────────────────────┘
  Resumo e totais atualizam na hora; o cartão continua aberto.
```

## 02. Aba Inativos sem "Totais mensais"

```text
┌ Inativos ─────────────────────────┐
│ Resumo — Inativos                 │
│ [ 4 Batizados ] [ 1 Não batiz. ]  │
│ (sem tabela de Totais mensais)    │
│ [ Ver cartões ]                   │
└───────────────────────────────────┘
```
Também aplica o ajuste anterior aprovado: só os 2 cartões de resumo nesta aba.

## 03. Alerta "Possível pioneiro regular" (35 h a 50 h)

Ao importar (e ao recalcular), quem não está marcado como pioneiro regular e tem um ou mais meses entre 35 h e 50 h recebe um alerta no topo:

```text
┌ ⚠ Possíveis pioneiros regulares (2) ─────────┐
│ Ana Souza · Grupo 2                           │
│ 3 meses entre 35 h e 50 h (mai, jun, ago)     │
│ [ Marcar como Pioneiro Regular ]              │
│ [ Tem potencial para PR ]   [ Ignorar ]       │
├───────────────────────────────────────────────┤
│ ...                                           │
└───────────────────────────────────────────────┘
```

- "Marcar como Pioneiro Regular": muda o cartão para pioneiro regular (vai para a aba Pioneiros reg.) e escreve nas anotações do superintendente: "Ana Souza — ajustada como Pioneiro Regular (3 meses entre 35 h e 50 h)".
- "Tem potencial para PR": não muda o cartão; escreve nas anotações do grupo dela: "Ana Souza — tem potencial para pioneiro regular (3 meses entre 35 h e 50 h)".
- "Ignorar": some o alerta para essa pessoa.
- A escolha fica salva; o alerta não volta para a mesma pessoa.

## Detalhes técnicos

- app.js: no `[data-apply]` apagar `pend[id]` antes do `render()` e mostrar aviso.
- renderTotals: `box.hidden = true` quando `state.active === "in"`.
- analyzer.js: função pura `prCandidates(cards, info)` (não PR, não inativo, meses com 35 ≤ horas < 50); guarda decisões em `state.prDecisions` (salvo no IndexedDB e no arquivo de análise, opcional ao abrir arquivos antigos).
- Testes novos em `ferramentas-testes/` para: faixa some após aplicar, totais ocultos em Inativos, limites 35/49,9/50 e PR já marcado não alertado. Rodar todos os testes das ferramentas + isolamento; conferir com Playwright em 393×687 e 1366×900.
