# Analisador de congregações — 5 ajustes

Só a pasta `public/ferramentas/Analisador/` (e o teste das ferramentas). Nada do aplicativo VisitaSC, sem troca de versão, sem Ajuda do app. Tudo o que já funciona continua igual (períodos, 6 meses, cartões de dois anos unidos, pastas, cartão mês a mês, PDF, salvar/abrir).

## 1. Pílulas em ordem e grupo "analisado"

```text
┌───────────────────────────────────┐
│ [Todos] [✓ Grupo 1] [Grupo 2]     │
│ [✓ Grupo 3] [Pioneiros reg.] [+]  │
├───────────────────────────────────┤
│ Grupo 2 · 14 cartões              │
│ ...resumo do grupo...             │
│ ┌───────────────────────────────┐ │
│ │   ✓ Encerrar análise do grupo │ │
│ └───────────────────────────────┘ │
│ (se já analisado:)                │
│  ✓ Analisado em 24/11 · Reabrir   │
└───────────────────────────────────┘
```

- Grupos em ordem crescente, respeitando números ("Grupo 2" antes de "Grupo 10"). "Todos" fica no início e "Pioneiros reg." no fim.
- O botão "Encerrar análise" põe ✓ na pílula. Continua dando para editar. "Reabrir" tira o ✓.
- A marcação vai junto quando você salva a análise. Análises antigas abrem normalmente, sem nenhum ✓.

## 2. Resumo dos grupos sem "Pioneiros regulares abaixo de 50 h"

O cartão sai do resumo dos grupos e do "Todos". A análise dos pioneiros fica só na pílula Pioneiros reg. (veja o item 5).

## 3 e 4. Totais mês a mês (por grupo e no geral)

Novo bloco "Totais mensais" abaixo do resumo, no grupo escolhido ou em "Todos". Uma tabela com rolagem lateral, com a primeira coluna fixa:

```text
┌───────────────────────────────────┐
│ Totais mensais          [▾ abrir] │
│              Mai  Jun  Jul  Ago ▸ │
│ PUBLICADORES                      │
│  Estudos       12   10   11    9  │
│  Irregulares    1    0    2    1  │
│ PIONEIROS AUXILIARES              │
│  Relataram      3    5    2    4  │
│  Horas        105  160   70  130  │
│  Estudos        4    6    2    5  │
│ PIONEIROS REGULARES               │
│  Relataram      4    4    4    4  │
│  Horas        210  198  205  190  │
│  Estudos        7    6    8    7  │
│ GERAL                             │
│  Estudos bíblicos 23   22   21  21│
│  Pion. auxiliares  3    5    2   4│
│  Irregulares       1    0    2   1│
│  Novos não batiz.  0    1    0   0│
│  Novos batizados   0    0    1   0│
└───────────────────────────────────┘
```

- Meses = o período escolhido no topo (6 meses, ano ou "Outro").
- "Publicadores" = quem não é pioneiro naquele mês.
- Pioneiros regulares entram em "Todos". No grupo, só os do grupo. Como os regulares ficam na pílula própria, a parte "Pioneiros regulares" aparece em "Todos" e na pílula Pioneiros reg.
- "Novos não batizados" e "Novos batizados" contam no mês em que a pessoa começou ou foi batizada, usando as mesmas regras do resumo atual.
- A tabela também entra no Relatório PDF.

## 5. Pioneiros regulares: meta anual de 600 h

Na pílula Pioneiros reg., ano de serviço de setembro a agosto:

```text
┌───────────────────────────────────┐
│ Ano de serviço 2027 (set–ago)     │
│ Até out: meta 100 h               │
├───────────────────────────────────┤
│ Ana Souza            ⚠ −22 h      │
│ Feitas 78 h · Meta até agora 100h │
│ Média 39 h/mês · precisa 52 h/mês │
├───────────────────────────────────┤
│ João Lima (iniciou em jan) ✓ +6 h │
│ Meta do ano 400 h (8 meses × 50)  │
│ Feitas 106 h · Meta até agora 100h│
└───────────────────────────────────┘
```

- Meta: 600 h no ano = 50 h por mês.
- Atraso = horas feitas até o último mês com relatório − (50 × meses decorridos).
- Quem começou durante o ano: meta = 50 × meses do início até agosto. Ex.: começou em janeiro → 8 meses → 400 h. O início é o primeiro mês marcado como pioneiro regular no cartão desse ano.
- Também mostra a média por mês e quantas horas por mês faltam até agosto para chegar na meta.
- Lista ordenada do mais atrasado ao mais adiantado. Toque no nome → cartão mês a mês (já existe).
- Usa o ano de serviço do período escolhido. Com "6 meses", usa o ano do último mês do período.


## 6. Importar arquivos do Circuit Manager (.json) e do TSWin (.xml)

O botão de importar passa a aceitar, além dos cartões em PDF, os arquivos `hourglass-export.json` e `Active.xml`. Também dá para arrastar os arquivos.

```text
┌───────────────────────────────────┐
│ [+ Cartões ou arquivos] [📁 Pastas]│
│  PDF S-21 · .json · .xml          │
├───────────────────────────────────┤
│ Conferir importação               │
│ Active-2.xml · 7 publicadores     │
│  Grupo 1 → [Grupo 1        ▾]     │
│  Grupo 2 → [novo: Grupo 2  ▾]     │
│  Pioneiros regulares → Pioneiros  │
│        [Cancelar]  [Importar]     │
└───────────────────────────────────┘
```

- Cada pessoa vira um cartão igual ao do PDF: nome, sexo, nascimento, batismo, ancião/servo, pioneiro regular, P.A. por mês, participou, estudos, horas e observações. Depois disso, as análises, as edições e o cartão mês a mês funcionam como já funcionam.
- **Grupos:** o grupo que vem no arquivo (`group` no XML, grupo de campo no JSON) vira uma pílula. Se o grupo não tiver nome, ele se chama "Grupo 1", "Grupo 2" e assim por diante. Os pioneiros regulares vão para Pioneiros reg. Antes de importar, aparece a mesma conferência das pastas.
- **Ano de serviço:** os meses de set a ago formam o cartão do ano. Por exemplo, set/2026 a ago/2027 = ano 2027. Um arquivo com dois anos vira dois cartões da mesma pessoa, unidos como já acontece hoje.
- **Publicador comum com "1 hora":** é a marcação de participação, como nos arquivos que o próprio Conversor gera. Ao importar, conta como "participou" e não soma horas.
- **Já existe a pessoa:** se o mesmo nome e o mesmo ano já estão carregados, o cartão é atualizado em vez de duplicar, igual a importar um PDF de novo.
- Arquivo de outro tipo ou com defeito: aparece um aviso e nada é alterado.
- Tudo é lido no aparelho. Nada é enviado para fora.

Técnico: `analyzer.js` ganha `fromCircuitJson(obj)` e `fromTswinXml(text)` (DOMParser), que geram o mesmo formato de cartão do `S21.parse`. `app.js` direciona pela extensão do arquivo e reaproveita a conferência de `folderGroups`. Testes com os dois arquivos enviados: quantidade de pessoas, grupos, um mês conhecido e a regra do "1 h".

## Detalhes técnicos

- `analyzer.js` (funções puras): `sortGroups` (comparação natural pt), `monthlyTotals(cards, opts)`, `pioneerYear(cards, year)`. Remover `rpLow` do `TILES` dos grupos; a lista continua disponível para os pioneiros.
- `app.js`: ordenação das pílulas, `group.done` (data ISO, opcional ao abrir), botão Encerrar/Reabrir, bloco de totais (`<details>` + tabela `overflow-x:auto` com primeira coluna `position:sticky`), painel de metas na aba `rp`, seções novas no PDF.
- `style.css`: estilos com cores do próprio site das ferramentas.
- Testes em `tests/ferramentas/`: ordem natural, totais de um mês conhecido, atraso com 50 × meses, pioneiro que começou em janeiro (meta 400 h).
- Verificar com Playwright em 393×687 que nenhum botão sai da tela.
