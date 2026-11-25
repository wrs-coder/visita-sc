# Analisador — aviso das 600 h recolhível e novo cartão no Resumo

Só altera o Analisador. Nada no Visita SC muda.

## 1. "⚠ (Ano anterior faltou: X h)" recolhível

No card de cada pioneiro em "Meta anual · 600 h", o aviso passa a ser um item que abre e fecha. Começa **fechado**; tocar mostra os meses do ano anterior abaixo de 50 h.

```text
Regina Ventura Eduardo Pedro >        ⚠ −3 h
Feitas 97 h · Meta até agora 100 h
┌─────────────────────────────────────┐
│ ⚠ (Ano anterior faltou: 27 h)     › │   <- fechado
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠ (Ano anterior faltou: 27 h)     ⌄ │   <- aberto
│ Out 2025  39 h                      │
│ Nov 2025  25 h                      │
│ Dez 2025  39 h ...                  │
└─────────────────────────────────────┘
```

## 2. Novo cartão em "Resumo — Pioneiros regulares"

Igual ao "Abaixo da média", logo depois dele:

```text
┌───────────────────────┐ ┌───────────────────────┐
│ Abaixo da média     › │ │ Não completaram     › │
│ 3                     │ │ 600 h no ano anterior │
│ atrás da meta de 600h │ │ 2                     │
└───────────────────────┘ └───────────────────────┘
```

Tocar abre a lista com nome e quanto faltou (ex.: "Regina Ventura Eduardo Pedro — faltou 27 h"); tocar no nome abre o cartão mês a mês, como nos outros cartões.
Conta quem serviu o ano anterior inteiro como pioneiro regular (desde setembro) e fez menos de 600 h, usando os cartões dos dois anos, não só os meses selecionados.

## Detalhes técnicos

- `analyzer.js`: `RP_TILES` ganha `{ key: "short600", label: "Não completaram 600 h no ano anterior", list: true }`; `analyzeRp` preenche a lista com `pioneerYear` (`shortYear` do ano encerrado ou `prevMissing` do ano seguinte).
- `app.js` `rpRows`: aviso vira `<details>` (fechado) com os meses abaixo de 50 h; PDF sem mudança.
- `style.css`: estilo do `<details>` dentro de `.lowm`, com tokens já existentes.
- Teste em `ferramentas-testes/analisador-inicio-pr.test.ts` com as horas da Regina (573 h → faltou 27 h, aparece no novo cartão); subir versão do cache `sw.js`.
