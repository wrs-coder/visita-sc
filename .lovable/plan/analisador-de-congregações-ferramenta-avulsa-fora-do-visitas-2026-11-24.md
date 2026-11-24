# Analisador de congregações (ferramenta avulsa, fora do VisitaSC)

## Antes de começar
O Circuit Manager (.json) e a correção da planilha do Hourglass já estão feitos e os 11 testes passam. Falta só a conferência num celular simulado (baixar os 3 arquivos com o seu S-21). Faço isso primeiro.

## Onde fica
- Endereço: visitasc.com.br/ferramentas/Analisador/
- Mesma linha do Conversor S-21: página separada, sem login, sem nuvem, nada enviado pela internet. Não entra no aplicativo (APK) nem no cache do app.
- Lê os cartões com a mesma regra do Conversor S-21 (inclusive o "Ano": 2026/2027, 26/27, 26/7 = 2027). Se a regra mudar lá, o Analisador acompanha.

## Tela principal (celular)

```text
┌─────────────────────────────────────────┐
│ Analisador de congregações              │
│ Lido só neste aparelho.                 │
│                                         │
│ Congregação: [ Central            ]     │
│ Período:  [ Mar 2026 ▾ ] a [ Ago 2026 ▾]│
│                                         │
│ ── Grupos de campo ──────────── [+ Grupo]│
│ ┌─────────────────────────────────────┐ │
│ │ Grupo 1 · João Silva       12 cart. │ │
│ │ [⬆ Adicionar cartões]  [Ver cartões]│ │
│ └─────────────────────────────────────┘ │
│ ┌─────────────────────────────────────┐ │
│ │ Grupo 2 · Pedro Lima        9 cart. │ │
│ │ [⬆ Adicionar cartões]  [Ver cartões]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ── Pioneiros regulares ──────────────── │
│ ┌─────────────────────────────────────┐ │
│ │ 5 cartões                           │ │
│ │ [⬆ Adicionar cartões]  [Ver cartões]│ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ── Resumo ─  [ Geral ▾ ] (ou um grupo)  │
│ ┌────────┬────────┬────────┬────────┐   │
│ │   6    │   4    │   31   │   7    │   │
│ │Anciãos │ Servos │Batiz.  │N.batiz.│   │
│ ├────────┼────────┼────────┼────────┤   │
│ │   2    │  3 ›   │  1 ›   │  4 ›   │   │
│ │Novos   │P.A.    │Novos   │Irregu- │   │
│ │n.batiz.│difer.  │batiz.  │lares   │   │
│ ├────────┼────────┼────────┼────────┤   │
│ │  1 ›   │  9 ›   │  2 ›   │        │   │
│ │Anc/SM  │Dirigem │P.R.    │        │   │
│ │como PA │estudos │< 50h   │        │   │
│ └────────┴────────┴────────┴────────┘   │
│ Dirigem estudos: [ Último mês ▾ ]       │
│                                         │
│ ── Anotações do superintendente ─────── │
│ ┌─────────────────────────────────────┐ │
│ │ Geral: ...                          │ │
│ └─────────────────────────────────────┘ │
│ (um campo por grupo também)             │
│                                         │
│ [ ⬇ Relatório PDF ] [ Salvar análise ]  │
│ [ Abrir análise salva ]                 │
└─────────────────────────────────────────┘
```

Números com "›" abrem a lista completa:

```text
┌─────────────────────────────────────────┐
│ ✕  Irregulares · Geral · Mar–Ago 2026   │
├─────────────────────────────────────────┤
│ Ana Souza · Grupo 1                     │
│   Sem pregar: Abr 2026, Jun 2026        │
│ Carlos Dias · Grupo 2                   │
│   Sem pregar: Jul 2026                  │
└─────────────────────────────────────────┘
```

"Ver cartões" mostra os cartões como no Conversor S-21 (dados e os meses de cada ano de serviço), com opção de corrigir, mover para outro grupo ou para Pioneiros regulares, e remover.

## Regras de cada número (no período escolhido)
- Cada pessoa conta uma vez. Cartões de anos de serviço diferentes da mesma pessoa (mesmo nome e nascimento) são juntados; setembro a agosto = um ano de serviço.
- Anciãos / Servos / Publicadores batizados / Publicadores não batizados: situação do cartão mais recente.
- Novos publicadores não batizados: não batizado e (observação com "novo publicador" ou "início como publicador") ou nenhum mês com pregação antes do primeiro mês em que pregou dentro do período.
- Pioneiros auxiliares diferentes: quem teve P.A. marcado em pelo menos um mês (ou é auxiliar contínuo). Mesma pessoa nunca conta duas vezes. Lista: nome e meses.
- Novos batizados: data de batismo dentro do período. Lista: nome e data.
- Irregulares: pelo menos um mês do período sem o tique de "Participou". Meses antes de a pessoa começar a pregar não contam. Lista: nome e meses sem pregar.
- Anciãos e servos que serviram como P.A.: lista com nome e meses.
- Dirigem estudos (o superintendente escolhe a regra):
  1. relatou estudos no último mês do período;
  2. relatou estudos nos 3 últimos meses seguidos do período;
  3. relatou estudos em pelo menos 3 meses do período, mesmo alternados.
  Lista: nome e meses com estudos.
- Pioneiros regulares abaixo de 50 horas: lista com nome e os meses abaixo de 50 h (com as horas).
- O período padrão são os 6 últimos meses com relatório; pode ser mudado.

## Exportar e guardar
- Relatório PDF: congregação, período, resumo geral e por grupo, listas completas e as anotações.
- "Salvar análise": baixa um arquivo para reabrir depois neste ou em outro aparelho (grupos, cartões e anotações). Nada fica guardado no navegador; ao fechar a página com dados não salvos, aparece um aviso.

## Detalhes técnicos
- Pasta nova `public/ferramentas/Analisador/` (index.html, style.css, analyzer.js com regras puras, app.js com a tela). Reaproveita `../S21_Export/converter.js` e `pdf-lib.min.js` (sem cópia).
- No converter.js, só é exposta a função que junta cartões da mesma pessoa (já existe internamente); as saídas do Hourglass, TSWin e Circuit Manager não mudam.
- Rota de desenvolvimento `src/routes/ferramentas.Analisador.ts`, igual à do Conversor (só entrega o HTML). `build-app-shell.mjs` e `sw.js` já excluem `/ferramentas/*`.
- PDF com pdf-lib (motor padrão do projeto).
- Testes novos em `src/lib/congregation-analyzer.test.ts`, um por regra (P.A. diferentes, novos batizados, irregulares, novos não batizados, as 3 regras de estudos, pioneiro abaixo de 50 h, junção de dois anos de serviço).
- Conferência com Playwright em 393×687: nenhum botão fora da tela, lista abre ao tocar no número, PDF e arquivo salvo baixam.
- Nada do aplicativo VisitaSC é alterado.
