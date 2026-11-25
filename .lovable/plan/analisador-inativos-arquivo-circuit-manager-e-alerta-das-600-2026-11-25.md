# Analisador — inativos, arquivo Circuit Manager e alerta das 600 h

Tudo fica só em `public/ferramentas/Analisador/` (e testes em `ferramentas-testes/`). Nada do aplicativo Visita SC muda.

## (01) Ano de serviço atual marca ativos como inativos

**Causa confirmada no código:** ao tocar em "Ano 2027", o período vai até **agosto de 2027**. A regra dos inativos conta os meses sem pregar **de trás para frente a partir do último mês do período**. Como o cartão S-21 do ano atual já tem as linhas de dez/jan/.../ago em branco (meses que ainda não aconteceram), esses meses contam como "não pregou". Resultado: 6+ meses "sem pregar" e a pessoa vira inativa. Com "6 meses" isso não acontece porque o fim é o último mês com relatório.

**Correção (pela data do aparelho):** o último mês avaliado é sempre o **mês anterior ao mês atual do aparelho** (ex.: em novembro/2026, conta até **outubro/2026**), porque os relatórios do mês da visita ainda não foram entregues. O fim efetivo é o menor entre o fim do período escolhido e esse mês.

- Vale para **inativos**, **perigo de ficar inativo** e **irregulares**.
- Pílula **"6 meses"** preenche automaticamente os 6 meses anteriores ao mês atual (em novembro/2026: **maio a outubro/2026**). Continua ajustável em "Outro".
- Períodos já encerrados não mudam.

Testes novos (com data simulada em 15/11/2026): "Ano 2027" com relatório até outubro → quem pregou em outubro não fica inativo nem irregular; "6 meses" = maio–outubro/2026.

## (02) O arquivo enviado (hourglass-export-3.json)

É a exportação completa do Hourglass usada pelo Circuit Manager. Contém:

- **Congregação:** Foto Sakala, nº 21460, Angola, endereço, telefone, dia/hora das reuniões (fim de semana domingo 09:00, meio de semana quarta 18:00), idioma pt-PT, fuso.
- **30 publicadores:** nome, sexo, batismo, designação (6 anciãos, 1 servo), situação (18 batizados, 11 não batizados, 1 missionário de campo), e-mail, grupo (7 com grupo).
- **85 relatórios** de set/2025 a ago/2026: horas, estudos, pioneiro auxiliar (11), observações.
- **Totais mensais** (14 meses) por publicadores, auxiliares e regulares.
- **1 grupo de campo** com dirigente, **assistência** (zerada), **privilégios** (quem faz cada parte), 1 endereço de exemplo; territórios vazios.

**É possível?** Sim, com a mesma estrutura, campos e ordem. O Conversor S-21 já gera esse arquivo; o Analisador vai usar essa mesma função e acrescentar o que só ele sabe: **os grupos de campo** (cada pessoa recebe seu grupo, e os grupos entram em "fsGroups").

O que **não** pode vir dos cartões S-21 (fica vazio, como o programa aceita): e-mail, telefones, endereços, dia/hora das reuniões, assistência, privilégios e dirigente do grupo. Números internos (ids) serão gerados, não iguais aos do Hourglass.

Na tela: botão "⬇ Arquivo Circuit Manager (.json)" junto às exportações, pedindo nome, número e país da congregação (lembrados neste aparelho), com conferência de totais antes de baixar. O nome do arquivo e o conteúdo não mencionam o Analisador.

Observação honesta: o formato foi conferido com este arquivo do Circuit Manager. Não tenho um arquivo de exemplo do **Circuit Assistant**; se ele aceitar o mesmo arquivo do Hourglass, funcionará. Se tiver um exemplo dele, posso conferir.

```text
┌───────────────────────────────┐
│ Exportar                      │
│ [📄 PDF dos grupos]           │
│ [⬇ Arquivo Circuit Manager]   │
│                               │
│ Congregação: [Foto Sakala   ] │
│ Número:      [21460         ] │
│ País:        [Angola      ▾ ] │
│        [Cancelar] [Baixar]    │
└───────────────────────────────┘
```

## (03) Alerta das 600 h no ano completo

Em "Meta anual · 600 h", quando o ano de serviço tiver os **12 meses (set–ago) com relatório** na congregação, e o pioneiro regular serviu como regular **o ano todo** (desde setembro) e somou **menos de 600 h**, aparece um alerta extra no cartão dele com a frase **"(Ano anterior faltou: 60 h)"**:

```text
┌───────────────────────────────┐
│ Maria Souza          540 h    │
│ ⚠ (Ano anterior faltou: 60 h) │
│   Meses abaixo de 50 h:       │
│   Out/25 42 h · Jan/26 38 h   │
│   Abr/26 45 h                 │
│ Média 45 h/mês                │
└───────────────────────────────┘
```

Abaixo da frase, a lista dos **meses do ano anterior com menos de 50 h e as horas de cada um** (mês sem relatório aparece como "sem relatório"). Também aparece um contador no topo da meta ("⚠ 2 não completaram as 600 h") e uma linha no PDF dos pioneiros. Quem começou no meio do ano continua com a meta proporcional e **não** recebe esse alerta. Ano ainda em andamento: sem alerta.

Testes novos: ano completo com 540 h → alerta; 600 h → sem alerta; começou em janeiro → sem alerta; ano incompleto → sem alerta.

## Detalhes técnicos

- Nova função `lastClosedMonth(hoje)` = mês anterior ao do aparelho; `inactiveMap`, irregulares e `lastMonths` usam `min(fimDoPeríodo, lastClosedMonth)`; testes injetam a data.
- `analyzer.js` `pioneerYear`: novos campos `fullYear` (todos os 12 meses do ano em reportedMonths), `wholeYear` (`start === from`), `shortYear = fullYear && wholeYear && done < 600`, `missing = 600 - done`; reaproveita a lista `low` (meses < 50 h) do ano completo para exibir mês e horas.
- Exportação: reutilizar `S21.toCircuit` (já carregado/disponível) com parâmetro opcional `groups` para preencher `group_id` e `fsGroups`; sem parâmetro, o Conversor S-21 gera exatamente o mesmo de hoje.
- Atualizar Ajuda da ferramenta e `instructions-ferramentas.md` conforme a regra; rodar todos os testes de `ferramentas-testes/` incluindo `isolamento.test.ts`.
