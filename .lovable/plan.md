# Analisador de congregações — 6 ajustes

Só arquivos em `public/ferramentas/Analisador/` (e o teste do analisador). Nada do app VisitaSC muda.

## 1. Ano de serviço correto
Regra: "2025/2026" = ano de serviço **2026** (set/2025 a ago/2026); "2026/2027" = **2027** (set/2026 a ago/2027). Vale também "26/27" e "26/7".
- O período deixa de ser "De/Até mês" e passa a ser **pílulas de ano de serviço** (ex.: `2026` `2027`), escolhendo por padrão o ano do cartão mais recente.
- Meses de cartões de outro ano não entram na conta de "Irregular".
- Cada cartão mostra o ano lido ("Ano 2027") para conferir; se estiver errado, dá para corrigir na hora.
- Primeiro passo: reproduzir com cartões "2025/2026" e "2026/2027" e confirmar a causa exata antes de corrigir.

## 2 e 4. Grupos lado a lado, em pílulas
```text
┌──────────────────────────────┐
│ Congregação [Central       ] │
│ Ano: (2026) [2027]           │
├──────────────────────────────┤
│ [Grupo 1][Grupo 2][Grupo 3]  │
│ [Pioneiros reg.]  [+ Grupo]  │
├──────────────────────────────┤
│ Grupo 2 · Dirigente [João  ] │
│ 12 cartões   [+ Importar S-21]│
│ Ana Souza   Ano 2027   ⟳  ✕  │
│ Bruno Lima  Ano 2027   ⟳  ✕  │
├──────────────────────────────┤
│ RESUMO — Grupo 2             │
│ ┌────┐┌────┐┌────┐┌────┐     │
│ │ 2  ││ 3  ││ 10 ││ 1  │ ... │
│ └────┘└────┘└────┘└────┘     │
│ Anotações do grupo           │
│ [ Escreva aqui…            ] │
├──────────────────────────────┤
│ [Geral] → resumo da congreg. │
│          + Anotações gerais  │
└──────────────────────────────┘
```
- Um toque na pílula troca o grupo (sem rolar a página). No tablet/computador as pílulas e o conteúdo usam a largura toda.
- Pílula **Geral** mostra o resumo da congregação toda e as anotações gerais.

## 3. Atualizar cartões com falha
- Botão **⟳** em cada cartão: escolhe o PDF novo e substitui só aquele cartão.
- **Importar S-21** de novo no grupo: se o nome (e ano) já existir, o cartão é **atualizado** em vez de duplicado; aparece aviso "3 atualizados, 2 novos".

## 5. Pioneiros regulares à parte
- Pílula própria "Pioneiros reg." com seu próprio resumo (horas abaixo de 50, estudos, irregulares) e anotações.
- Não entram nos números dos grupos; o resumo **Geral** soma todos.

## 6. Anotações junto de cada resumo
- Fim da lista gigante: cada grupo tem suas anotações embaixo do seu resumo; Geral tem as anotações gerais; Pioneiros as suas.
- PDF e "Salvar análise" continuam com as mesmas anotações; análises salvas antes abrem normalmente.

## Detalhes técnicos
- `analyzer.js`: período por ano de serviço (`serviceYearEnd` do conversor), `analyze` filtra por meses do ano escolhido; escopo "rp" separado do "all-groups".
- `app.js`/`index.html`/`style.css`: barra de pílulas com scroll horizontal e quebra de linha, área ativa única, notas por área, botão ⟳ (substituir cartão por id), merge na importação por nome+ano.
- Arquivo salvo: mesmo formato (version 1), `period` antigo convertido para o ano de serviço.
- Testes em `src/lib/congregation-analyzer.test.ts`: "2025/2026"→set/2025–ago/2026; "26/7"→2027; pioneiro regular fora do resumo dos grupos; reimportação substitui sem duplicar.
- Conferir com Playwright em 393×687 que nenhum botão sai da tela.
