# Correções: cronômetro, rolagem, bolha de anexos, barra do Modo Esboço e Esboço do pastoreio

## O que encontrei (causas reais)
- **(01) Cronômetro:** por engano, coloquei a boia na *Tela cheia* (⤢), que não foi pedido, e o *Modo Esboço* (📖) continuou com o cronômetro preso no topo. Correção: a boia vai para o Modo Esboço e a Tela cheia volta exatamente como era antes (cronômetro no lugar original, sem nenhuma outra mudança).
- **(02) Rolagem:** o modo edição tem duas rolagens (a dos campos de cima, limitada a 38% da tela, e a do texto). Quando a altura é recalculada (teclado, alça de altura), uma delas some porque a altura passa a caber "na conta" sem sobrar.
- **(03) Bolha de anexos:** ela ainda é desenhada no mesmo lugar da antiga faixa de miniaturas, e a altura do texto ainda desconta esse espaço.
- **(04) Topo do Modo Esboço:** "Ajustes do tempo por tópico" e "Recolher todos" ficam numa linha própria; a faixa do topo rola junto em alguns casos.
- **(05) Esboço do pastoreio:** a nota abre numa camada acima de tudo (nível 90), mas as janelas de **link**, **anexar imagem/vídeo** e listas aparecem num nível mais baixo (50) — elas abrem *escondidas atrás* da nota. Além disso, a nota não tem a boia de "textos bíblicos encontrados", então as citações digitadas não viram balões.

## Prévia — Modo Esboço (01, 03, 04)
```text
┌─────────────────────────────┐
│ ←  Visita Rute      (i)  ⋯  │ ← barra FIXA (texto rola por baixo)
├─────────────────────────────┤
│ 1. Introdução         ⏱ 3m  │
│   Leia Rute 1:16 [📖]        │
│ 2. Lealdade           ⏱ 5m  │
│   ...texto ocupa o espaço   │
│   onde ficavam miniaturas   │
│                    ┌──────┐ │
│                    │⋮ 04:12│ │ ← boia do cronômetro (arrasta)
│ ┌───────┐          └──────┘ │
│ │🖼 3 ▶1│ ← bolha de anexos   │
│ └───────┘   (arrasta, abre   │
│              a grade)        │
└─────────────────────────────┘
Menu ⋯ :  Ajustes do tempo por tópico
          Recolher / Expandir todos
          (demais itens que já existem)
```
- Sai a faixa com o cartão do título + cronômetro: o título já está na barra e os detalhes no (i).
- Barra do topo fica fixa; só o esboço rola.

## Prévia — Modo Edição (02, 03)
```text
┌─────────────────────────────┐
│ ←  📖  (i)  ⤢   ⋯   💾       │
├─────────────────────────────┤
│ Texto do esboço...        ▐ │ ← rolagem do texto sempre visível
│ ...                       ▐ │
│ (espaço das miniaturas     ▐ │
│  agora é texto)   ┌───────┐ │
│                   │🖼 3 ▶1│ │ ← bolha livre
│                   └───────┘ │
├─────────────────────────────┤
│ ↶  Aa  12▾  T  T▣  ≡  ⋯     │ ← barra colada no teclado
└─────────────────────────────┘
```
- As duas rolagens ficam sempre ativas (a dos campos de cima e a do texto), com barra visível no celular.

## Prévia — Nota de Pastoreio (05)
```text
┌─────────────────────────────┐
│ ←  Família Silva  📖 ⤢ 🗑 ✓  │
├─────────────────────────────┤
│ ▾ Informações da visita      │ ← toca para recolher/expandir
│   Data da visita  [16/11]    │
│   Acompanhante   [João]      │
│   Nome dos envolvidos        │
│   ┌───────────────────────┐ │ ← campo de várias linhas,
│   │Pedro, Ana, filhos...  │ │   igual a "Informações
│   └───────────────────────┘ │   adicionais"
│   Informações adicionais     │
│   ┌───────────────────────┐ │
│   └───────────────────────┘ │
│ Esboço do pastoreio          │
│  Leia Salmo 23:1 [📖]        │ ← balões bíblicos funcionando
│              ┌──────────┐   │
│              │📖 3 textos│   │ ← boia de textos encontrados
│              └──────────┘   │
├─────────────────────────────┤
│ ↶  Aa  🔗  🖼  ▶  ⋯          │ ← link/imagem/vídeo abrem por cima
└─────────────────────────────┘
```
- Recolhido mostra uma linha resumo: "16/11 · João · 3 pessoas". O aparelho lembra se estava recolhido.

## O que não muda
**Tela cheia (⤢): volta a ser como era antes da última alteração e não recebe nenhuma das mudanças deste plano.**
Conteúdo salvo, sincronização, formato dos esboços, tempo por tópico, avisos do cronômetro, balão bíblico e dados das notas de pastoreio.

## Detalhes técnicos
- `OutlinesWorkspace.tsx` (modo outline inline): trocar `OutlineTimer variant="toolbar"` por `FloatingOutlineTimer`; remover a faixa sticky do cartão/título; o `toolbarSlot` de `RichOutlineContent` (ajustes de tempo + recolher todos) passa a ser renderizado como itens do menu ⋯ existente (expor ações via callback/ref em vez de portal no slot). `FullscreenOutline` (tela cheia): reverter `FloatingOutlineTimer` para o `OutlineTimer` original na posição anterior; nenhuma outra mudança nela (mantém faixa de anexos e linha de zoom/recolher como antes).
- Cabeçalho do modo esboço com `sticky top-0` dentro do contêiner que rola (ou contêiner `flex-col` com cabeçalho `shrink-0` e corpo `overflow-y-auto`).
- `OutlineAttachmentsBar`: nova variante flutuante (portal, arrastável, encaixa na borda, posição salva em localStorage, mesmo padrão de `FloatingVersePanel`/`timer-float-prefs`). Remover `attachRow` dos cálculos de altura.
- Rolagens: corpo do editor com `overflow-y: scroll` + `scrollbar-gutter: stable`; cálculo `minH/maxH` sem igualar exatamente a altura do contêiner pai; campos de cima mantêm `overflow-y-auto` com altura mínima.
- `PastoralNoteDetail`: overlay sobe para nível que não esconda Radix (baixar overlay para z-50 com portal próprio, ou elevar dialogs/sheets/popovers abertos dentro dele via classe de contêiner); adicionar `FloatingVersePanel` com detecção igual à do Esboço Pessoal; seção de campos recolhível (localStorage `pastoral.fieldsCollapsed`); "Nome dos envolvidos" vira `Textarea` auto-crescente.
- Testes: unitários para a posição da bolha (encaixe/limites) e para o resumo recolhido; verificação no navegador em 393×687 de cada tela (modo esboço, edição, nota de pastoreio abrindo link/anexo).
