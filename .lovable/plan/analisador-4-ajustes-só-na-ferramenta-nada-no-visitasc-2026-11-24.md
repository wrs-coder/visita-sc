# Analisador — 4 ajustes (só na ferramenta, nada no VisitaSC)

Sim, os quatro ajustes são possíveis e seguros. Mudam só a forma de mostrar os dados na tela do Analisador. Os cartões importados, as regras de ano, a análise salva e o relatório em PDF continuam iguais.

## 1. Resumo — Pioneiros regulares (só 5 cards)

Na pílula "Pioneiros reg." o resumo passa a mostrar apenas estes cards. Nas pílulas Geral e grupos nada muda.

```text
┌──────────────────────────────────┐
│ Resumo — Pioneiros regulares     │
│ ┌──────────────┐┌──────────────┐ │
│ │ 2            ││ 1            │ │
│ │ Anciãos –    ││ Servos min. –│ │
│ │ Pion. reg.   ││ Pion. reg.   │ │
│ └──────────────┘└──────────────┘ │
│ ┌──────────────┐┌──────────────┐ │
│ │ 5          › ││ 0          › │ │
│ │ Dirigem      ││ Irregulares  │ │
│ │ estudos      ││              │ │
│ └──────────────┘└──────────────┘ │
│ ┌──────────────┐                 │
│ │ 3          › │                 │
│ │ Abaixo da    │                 │
│ │ média        │                 │
│ └──────────────┘                 │
└──────────────────────────────────┘
```
- "Abaixo da média" = pioneiros que estão atrás da meta anual (mesma conta do quadro "Meta anual · 600 h"). Ao tocar, abre a lista desses nomes.
- Toque em "Dirigem estudos", "Irregulares" e "Abaixo da média" abre a lista (igual hoje).

## 2. "Meta anual · 600 h" recolhível

```text
Fechado:                          Aberto:
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Meta anual · 600 h  3 ⚠   ⌄ │  │ Meta anual · 600 h  3 ⚠   ⌃ │
└──────────────────────────────┘  │ Ano 2027 (set/26 a ago/27)   │
                                  │ Maria Silva        ⚠ −12 h   │
                                  │ João Souza         ✓ +4 h    │
                                  └──────────────────────────────┘
```
- Toque na barra do título abre/fecha. Começa aberto. O aparelho lembra a escolha.
- No título fica o número de pioneiros abaixo da meta, para ver sem abrir.

## 3. Pílulas mostram pessoas, não cartões

```text
[ Geral 48 ] [ Grupo 1 12 ] [ Grupo 2 15 ] [✓ Pioneiros reg. 6 ] [+ Grupo]
```
- O número passa a contar pessoas (quem tem cartão 2026 e 2027 conta 1).
- Dentro do grupo, o contador ao lado dos campos fica "12 pessoas".

## 4. "Ver cartões": um cartão único por pessoa

Hoje aparecem dois itens para a mesma pessoa (Ano 2026 e Ano 2027). Passa a ser um item só, com pílulas de ano dentro dele:

```text
┌──────────────────────────────────┐
│ ▸ Maria Silva   2026 · 2027      │
├──────────────────────────────────┤
│ ▾ João Souza    2026 · 2027      │
│   [ Ano 2026 ] [●Ano 2027 ]      │
│   Nome / Sexo / Designação ...   │
│   Mês   Part. Est. P.A. Horas    │
│   Set    ✓     1    ·    —       │
│   ...                            │
│   [⟳ Trocar por PDF novo]        │
│   [Remover este cartão]          │
└──────────────────────────────────┘
```
- Um toque abre a pessoa já no ano do período escolhido; trocar de ano é tocar na pílula, sem fechar e abrir outro item.
- Editar, trocar por PDF e remover continuam valendo para o ano selecionado (os dados de cada ano continuam separados por dentro, para não estragar as regras de ano).

## Detalhes técnicos
- `analyzer.js`: novo `RP_TILES` (elderRp, msRp, studies, irregular, below) e `analyzeRp()` que usa `analyze` + `pioneerYear` (diff < 0 → below). `TILES` e `analyze` existentes intocados.
- `app.js`: `renderSummary` escolhe `RP_TILES` quando `state.active === "rp"`; `openList` aceita "below". `renderGoals` vira `<details>` com estado em localStorage (`analisador.rpOpen`). `renderTabs`/`areaHtml` usam `A.people(...).length`. `areaHtml` agrupa cartões por pessoa (`A.people`) e renderiza um item com pílulas de ano; `cardHtml` continua igual para o cartão do ano ativo (estado `openYear[pessoa]`).
- `style.css`: estilo da barra recolhível e pílulas de ano dentro do item.
- Testes novos em `ferramentas-testes/` (contagem por pessoas, "abaixo da média", agrupamento de dois cartões). Rodar todos + teste de isolamento; verificar com Playwright em 393×687 que nenhum botão sai da tela.
- Commit com prefixo "ferramentas:". Nada em `src/`, sem mudança de versão nem Ajuda do app.
