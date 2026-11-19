# Fontes de matéria: link embutido em cada publicação/vídeo

## O que muda
Hoje cada linha tem um texto ("A Sentinela ... | Sfg 1:18-19") e links soltos, que no PDF viram "Clique aqui (2)" + endereços visíveis. Passa a ser: **cada publicação ou vídeo é um item com seu próprio nome e seu próprio link**. No PDF o próprio nome fica azul e sublinhado, e tocar nele abre só aquele link. Nenhum endereço aparece na folha.

## Tela (preencher a pauta)
```text
┌─────────────────────────────────┐
│ FONTES DE MATÉRIA               │
│ ┌─────────────────────────────┐ │
│ │ 📖 Leitura                  │ │
│ │  Nome  [Lucas 6:40        ] │ │
│ │  Link  [wol.jw.org/...    ] │ │
│ │  + Adicionar outra leitura  │ │
│ ├─────────────────────────────┤ │
│ │ 📚 Artigo                   │ │
│ │  Nome  [A Sentinela 15/2..] │ │
│ │  Link  [wol.jw.org/...    ] │ │
│ │  ─────────────────────── ✕  │ │
│ │  Nome  [Sfg 1:18-19       ] │ │
│ │  Link  [docs.jw.org/...   ] │ │
│ │  + Adicionar outro artigo   │ │
│ ├─────────────────────────────┤ │
│ │ ▶ Vídeo                     │ │
│ │  Nome  [Que tipo de pessoa] │ │
│ │  Link  [jw.org/finder...  ] │ │
│ │  + Adicionar outro vídeo    │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```
- Link é opcional: sem link, o nome sai como texto normal.
- Botão ✕ remove só aquele item.

## PDF (os três modelos)
```text
 📖 Lucas 6:40
 📚 A Sentinela 15 de Fev. 2015 págs. 15-18 | Sfg 1:18-19
 ▶  Que tipo de pessoa eu devo ser? | Jeová reconhece o seu valor
```
Todos os itens do mesmo tipo (Leitura, Artigo ou Vídeo) ficam na MESMA linha, separados por " | ", mesmo que sejam 3 ou mais; só passam para a linha de baixo quando acabar o espaço (a quebra acontece entre palavras, e o pedaço que desceu continua clicável). Nomes com link em azul sublinhado. Some "Clique aqui" e a lista de endereços.

## Pautas já preenchidas
Convertidas automaticamente ao abrir: o texto é dividido em "|" e cada parte recebe o link na mesma ordem (1º nome ↔ 1º link). Sobras de links viram itens "Link 2", "Link 3". Nada é perdido.

## Detalhes técnicos
- `agenda.ts`: `AgendaLinkItem` ganha `parts: {id,title,url}[]` (limite 10 por linha, `safeUrl`); normalizador migra `text`/`urls` antigos para `parts`; `allUrls` e modelos (stripForTemplate mantém nomes, limpa nada pessoal) adaptados; mesclagem SC/ancião preservada.
- `ElderAgendaView.tsx` e `ElderAgendaFullscreen.tsx`: editor por item; na tela cheia cada nome é um link que abre no navegador.
- `agenda-pdf.ts`: escrever partes em sequência com `pdf.link` sobre a área de cada nome, sublinhado, com quebra de linha.
- Testes: migração do formato antigo, PDF sem "Clique aqui", item sem link vira texto.
