# Pílulas de dias e de seções nos modelos

Só muda a aparência e a navegação. Nenhum dado salvo, campo ou regra de gravação muda.

## O que existe hoje (conferido)
- Os dois modelos usam os mesmos 7 dias da visita: Ter (1º dia), Qua, Qui, Sex, Sáb, Dom e **Seg** (Segunda já existe como último dia).
- "Modelos de Programação Pessoal" mostra Estudos, o bloco "Informações adicionais do superintendente", Refeições e Transporte empilhados numa página longa.
- "Modelo Reuniões de Campo" mostra todos os dias empilhados.

## (01) Pílulas de dias — Reuniões de Campo (celular 393px)

```text
+-----------------------------------------+
| Modelo: [ Campo 2 turnos        v ] ... |
+-----------------------------------------+
| Dias da visita          [ ] Segunda     |  <- chave para mostrar Seg
| (Ter)(Qua)(Qui)(Sex)                    |
| (Sáb)(Dom)                              |  <- quebra em 2 linhas, sem rolar
|   ^ Ter selecionada (cor primária)      |
|   pílula com ponto = dia com itens      |
+-----------------------------------------+
| TERÇA (1º dia) · 2 turnos               |
|  > Manhã · 08:30 · Casa em casa     [x] |
|  > Tarde · 15:00 · Testemunho       [x] |
|  [+ Adicionar turno nesta terça]        |
+-----------------------------------------+
|                       [ Salvar modelo ] |
+-----------------------------------------+
```

- Só o dia escolhido aparece; os outros ficam guardados, nada se perde.
- Pílulas em grade que quebra linha (cabe na largura do celular, sem rolagem lateral). Cada pílula mostra um pontinho quando o dia tem itens.
- **Segunda:** chave "Segunda" desligada por padrão. Ligada, a pílula "Seg" aparece no fim. Se o modelo já tiver itens na segunda, a chave já vem ligada (para nada ficar escondido).
- "Adicionar" cria o item já no dia selecionado.

## (02) Programação Pessoal — seção primeiro, depois dias

```text
+-----------------------------------------+
| Modelo: [ Visita padrão         v ] ... |
| Nome do modelo [ Visita padrão       ]  |
+-----------------------------------------+
| (Estudos e Revisitas)(Refeições)        |
| (Transporte)                            |  <- pílulas de seção
+-----------------------------------------+
| Dias da visita          [ ] Segunda     |
| (Ter)(Qua)(Qui)(Sex)(Sáb)(Dom)          |
+-----------------------------------------+
| ESTUDOS E REVISITAS · QUARTA            |
|  Informações adicionais do superint.    |
|  [ ......................... ]          |
|  > Manhã · 09:00 · João Silva       [x] |
|  [+ Adicionar nesta quarta]             |
+-----------------------------------------+
| > Informações gerais (recolhido)        |  <- só em Estudos e Revisitas
+-----------------------------------------+
```

- Pílulas de seção: "Estudos e Revisitas" (inclui as Informações adicionais do superintendente por dia e as gerais), "Refeições" (inclui a observação do dia) e "Transporte".
- Depois de escolher a seção, aparecem as pílulas de dias, com a mesma chave "Segunda".
- **Transporte:** hoje é uma lista de eventos sem dia fixo da visita. Se não houver dia ligado a cada evento, a seção Transporte mostra a lista como hoje (sem pílulas de dias). Isso será confirmado na leitura do código antes de mexer.
- A seção e o dia escolhidos ficam lembrados no aparelho ao voltar à tela.

## O que não muda
Banco, campos salvos, importar/exportar, duplicar, botão Salvar, propagação para visitas, telas dos anciãos e painel.

## Detalhes técnicos
- Novo componente compartilhado `src/components/templates/DayPills.tsx`: grade `flex flex-wrap gap-1.5`, pílulas no estilo de `DayPillsStrip` (tokens `primary`/`border`/`muted`), ponto indicando dia com itens, `Switch` "Segunda" (day_offset 6).
- Preferências (seção, dia, Segunda visível) em localStorage por tela e por modelo; Segunda forçada visível quando existir item com `day_offset === 6`.
- `_app.modelo-reunioes-de-campo.tsx`: filtrar a lista pelo dia escolhido; `addItem` usa o dia ativo.
- `_app.modelos.tsx`: `ToggleGroup` de seções; `KindBlock` renderiza só o dia ativo; `dayExtra` (notas por dia) continua igual; Transporte mantido sem dias se não tiver campo de dia.
- Rótulos novos em pt/en/es. Validar com `bunx tsgo --noEmit`, `bunx vitest run`, teste do helper de visibilidade da Segunda, e captura em 393px.
