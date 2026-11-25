# Analisador — corrigir "Anciãos e servos sem estudos" e nunca afirmar sem dados

## O que aconteceu (confirmado no código)
O Waldir tem os cartões 2024/2025 e 2026/2027 importados, mas **não tem o cartão 2025/2026** (Set 2025 a Ago 2026).
Com a regra "Relatou estudos nos 3 últimos meses seguidos", o Analisador olha Ago, Set e Out 2026.
Ago 2026 não existe no cartão dele, e hoje isso é tratado como "não dirigiu" — por isso ele caiu na lista, embora tenha 3 e 4 estudos em Set e Out.
Falta de cartão não é prova de nada; o Analisador não pode concluir algo com dados ausentes.

## O que vai mudar (só no Analisador)
1. **Mês sem cartão nunca conta como "sem estudos".** A regra avalia só meses com relatório da pessoa.
2. **Nova situação "Dados incompletos".** Se faltar mês para aplicar a regra, a pessoa não entra em "Dirigem estudos" nem em "Sem estudos"; aparece num aviso com o mês que falta:
```text
┌─────────────────────────────────────┐
│ ⚠ Faltam cartões para conferir (1) ›│
│ Waldir Jose Marques                 │
│ Sem relatório de Ago 2026 — importe │
│ o cartão 2025/2026                  │
└─────────────────────────────────────┘
```
3. **Motivo verdadeiro em cada nome** da lista "sem estudos", ex.: "Ancião · Sem estudos em Ago, Set, Out 2026" (em vez de frase genérica).
4. **Mesma revisão nas outras contas que podem sofrer o mesmo erro:** irregulares, inativos, auxiliares, pioneiros abaixo de 50 h e meta 600 h — mês sem cartão vira "dados incompletos", nunca "não pregou"/"0 h".
5. **Conferência da importação:** ao importar, avisar quando uma pessoa tem buraco entre anos de serviço (ex.: tem 2025 e 2027, falta 2026).

## Testes
- Caso do Waldir (cartões 2025 e 2027, estudos em Set/Out 2026): não pode aparecer em "sem estudos"; aparece em "Dados incompletos".
- Ancião com cartão completo e 0 estudos: continua em "sem estudos".
- Casos equivalentes para irregular/inativo com mês ausente.
- Todos os testes atuais das ferramentas continuam passando; Visita SC intocado.

## Detalhes técnicos
- `analyzer.js` (bloco "Dirigem estudos" ~linhas 138-145): `last3` passa a usar `live.slice(-3)`, e se algum desses meses não estiver em `h.months` → lista nova `L.incomplete` com os meses faltantes; mesma lógica para `last` e para irregulares/inativos/`rpLow`/`pioneerYear`.
- `app.js`: card/aviso "Faltam cartões para conferir" e detalhe com meses reais; PDF não lista incompletos como sem estudos.
- `sw.js`: subir versão do cache.
- Novo teste em `ferramentas-testes/`.
