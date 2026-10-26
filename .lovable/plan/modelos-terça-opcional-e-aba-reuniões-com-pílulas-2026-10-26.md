# Modelos: Terça opcional e aba Reuniões com pílulas

Só aparência e navegação. Nada muda no que já está salvo, no banco, na importação/exportação nem nas telas dos anciãos.

## (01) Terça (1º dia) opcional — Programação e Campo

```text
+-----------------------------------------+
| (Estudos e Revisitas)(Refeições)(Transp)|
+-----------------------------------------+
| DIAS DA VISITA                          |
| Terça [ ]                 Segunda [ ]   |  <- duas chaves, desligadas
| (Qua)(Qui)(Sex)(Sáb)(Dom)               |
|   Qua selecionada                       |
+-----------------------------------------+
| Ligando "Terça":                        |
| ┆Ter┆(Qua)(Qui)(Sex)(Sáb)(Dom)           |  <- Ter tracejada no início
+-----------------------------------------+
```

- Terça passa a funcionar igual à Segunda: some por padrão, aparece ao ligar a chave "Terça", com borda tracejada.
- Se o modelo já tiver algo na terça (estudo, refeição, observação ou turno de campo), a chave já vem ligada e travada, para nada ficar escondido.
- Vale para as pílulas de Estudos e Revisitas e Refeições (aba Programação) e para a aba Campo.
- A lista "Dia" dentro de cada item também deixa de oferecer Terça quando ela está desligada.
- Escolha lembrada no aparelho, por tela e por modelo.

## (02) Aba Reuniões

```text
+-----------------------------------------+
| (Pacotes)(Programação)(Campo)(Reuniões) |
+-----------------------------------------+
| Modelo: [ Padrão              v ]  ...  |
+-----------------------------------------+
| (Meio de semana)(Fim de semana)         |
| (Pioneiros)(Anciãos)                    |  <- antes era lista suspensa
+-----------------------------------------+
| MEIO DE SEMANA                          |
|  Dia [ Quarta v ]  Horário [19:30]      |
|  ...campos atuais...                    |
+-----------------------------------------+
|                    [ Salvar modelo ]    |  <- movido para baixo
+-----------------------------------------+
```

- A lista suspensa "Meio de semana / Fim de semana / Pioneiros / Anciãos" vira pílulas, no mesmo desenho das pílulas de seção da aba Programação.
- "Salvar modelo" sai do topo do cartão e vai para o rodapé, botão arredondado igual às outras abas. Mesma função, mesmo texto.

## O que não muda
Campos, gravação, propagação para visitas, duplicar, renomear, excluir, importar/exportar, demais abas.

## Detalhes técnicos
- `src/lib/template-day-pills.ts`: `visibleTemplateDays(showMonday, hasMonday, showTuesday, hasTuesday)` com `TUESDAY_OFFSET = 0`; base passa a ser [1..5]; `clampActiveDay` inalterado. Atualizar `template-day-pills.test.ts` (Terça escondida por padrão, aparece ao ligar, aparece com itens, dia ativo cai para Qua).
- `src/components/templates/DayPills.tsx`: `useTemplateDays(prefKey, hasMonday, hasTuesday)` com pref `:tuesday`; dia inicial padrão 1; segunda `Switch` "Terça" e borda tracejada em Ter.
- `_app.modelos.tsx`: calcular `hasTuesdayItems` (itens day_offset 0 + notas de estudo/refeição do dia "0"); `DAY_OPTS` do Select de item filtrado pelos dias visíveis (mantendo o valor atual do item).
- `_app.modelo-reunioes-de-campo.tsx`: idem com `day_offset === 0`.
- `_app.modelo-reunioes-discursos.tsx`: trocar `Select` de `activeTab` por `SectionPills`; mover botão Salvar para rodapé (`flex justify-end`, `rounded-full`).
- i18n pt/en/es: `templates.dayPills.tuesday`.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e captura em 393px.
