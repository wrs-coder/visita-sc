# Analisador — início do pioneiro regular pelas horas relatadas

Só altera o Analisador (`public/ferramentas/Analisador/`). Nada no Visita SC muda.

## Regra nova (sua definição)

Só relatam horas: pioneiro regular, pioneiro auxiliar, pioneiro especial e missionário em campo.
Então, num cartão com o tique "Pioneiro regular", **o início como PR é o primeiro mês em que ele relatou horas sem estar marcado como auxiliar, especial ou missionário**.

- Mês com horas e tique de "Pioneiro auxiliar" → ainda não é PR (era auxiliar).
- Mês com horas e observação "pioneiro especial" ou "missionário" → não é PR.
- Mês sem horas antes disso → não conta.
- Depois que começou, um mês com 0 h ou em branco **continua contando** (doença, viagem) — entra na lista de meses abaixo de 50 h.
- Se ele relatou horas como PR já em setembro → serviu o ano todo.

## Alerta das 600 h

Para cada ano de serviço já encerrado (set–ago, todos os meses anteriores ao mês do aparelho):
- Se o início foi em setembro e a soma for menor que 600 h:
  `⚠ (Ano anterior faltou: X h)` + lista dos meses abaixo de 50 h com as horas.
- O alerta aparece mesmo com a tela no ano atual, desde que o cartão do ano anterior esteja importado.
- Deixa de exigir que a congregação inteira tenha os 12 meses lançados; basta o cartão do próprio pioneiro.

Quem começou no meio do ano: meta proporcional (50 h × meses do início até agosto), sem o alerta "ano anterior".

## Exemplo

```text
Set  Aux ✓ 30 h   -> auxiliar (não conta)
Out  —   45 h     -> início como PR
Nov  —    0 h     -> conta (abaixo de 50)
...  Meta: 11 meses × 50 = 550 h
```

## Detalhes técnicos

- `analyzer.js` `pioneerYear`: trocar o cálculo de `start` (hoje: observação "pioneiro regular" ou primeiro mês com horas) pela regra acima; `shortYear` passa a depender de `start === set` e do ano estar encerrado pelo mês do aparelho, não de `fullYear` da congregação.
- Calcular também o ano anterior ao selecionado para exibir o alerta no card do ano atual.
- Testes em `ferramentas-testes/`: auxiliar antes do PR, mês 0 h após o início, especial/missionário, ano completo < 600 h, alerta visível no ano atual.
- Atualizar versão do cache offline (`sw.js`) e `instructions-ferramentas.md`.
