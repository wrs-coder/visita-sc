# Analisador — inativos, arquivo Circuit Manager e alerta das 600 h

Tudo fica só em `public/ferramentas/Analisador/` (e testes em `ferramentas-testes/`). Nada do aplicativo Visita SC muda.

## (01) Ano de serviço atual marca ativos como inativos

**Causa confirmada no código:** ao tocar em "Ano 2027", o período vai até **agosto de 2027**. A regra dos inativos conta os meses sem pregar **de trás para frente a partir do último mês do período**. Como o cartão S-21 do ano atual já tem as linhas de dez/jan/.../ago em branco (meses que ainda não aconteceram), esses meses contam como "não pregou". Resultado: 6+ meses "sem pregar" e a pessoa vira inativa. Com "6 meses" isso não acontece porque o fim é o último mês com relatório.

**Correção:** a regra dos inativos (e o aviso "perigo de ficar inativo") passa a usar como fim o **menor** entre o fim do período escolhido e o **último mês com relatório na congregação**. Meses futuros nunca contam. Não muda nada para períodos já encerrados.

Teste novo: cartões do ano atual com relatório só até outubro + escolher "Ano 2027" → ninguém que pregou em outubro fica inativo.

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

Em "Meta anual · 600 h", quando o ano de serviço tiver os **12 meses (set–ago) com relatório** na congregação, e o pioneiro regular serviu como regular **o ano todo** (desde setembro) e somou **menos de 600 h**, aparece um alerta extra no cartão dele:

```text
┌───────────────────────────────┐
│ Maria Souza          540 h    │
│ ⚠ Serviu o ano todo e não     │
│   completou as 600 h          │
│   (faltaram 60 h)             │
│ Média 45 h/mês                │
└───────────────────────────────┘
```

Também aparece um contador no topo da meta ("⚠ 2 não completaram as 600 h") e uma linha no PDF dos pioneiros. Quem começou no meio do ano continua com a meta proporcional e **não** recebe esse alerta. Ano ainda em andamento: sem alerta.

Testes novos: ano completo com 540 h → alerta; 600 h → sem alerta; começou em janeiro → sem alerta; ano incompleto → sem alerta.

## Detalhes técnicos

- `analyzer.js` `inactiveMap`: `last = min(upTo, último reportedMonths)`.
- `analyzer.js` `pioneerYear`: novos campos `fullYear` (todos os 12 meses do ano em reportedMonths), `wholeYear` (`start === from`), `shortYear = fullYear && wholeYear && done < 600`, `missing = 600 - done`.
- Exportação: reutilizar `S21.toCircuit` (já carregado/disponível) com parâmetro opcional `groups` para preencher `group_id` e `fsGroups`; sem parâmetro, o Conversor S-21 gera exatamente o mesmo de hoje.
- Atualizar Ajuda da ferramenta e `instructions-ferramentas.md` conforme a regra; rodar todos os testes de `ferramentas-testes/` incluindo `isolamento.test.ts`.
