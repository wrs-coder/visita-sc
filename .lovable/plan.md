# Balão bíblico mais limpo (estilo iOS / One UI)

O balão continua do mesmo tamanho, com o mesmo arrastar, as mesmas cores de fundo e os mesmos destaques já salvos. Só muda a arrumação dos botões.

## Como fica

```text
ANTES (topo apertado)
┌───────────────────────────────┐
│ ⠿ 📖 Mat...    [≡][📋][📝][✕] │
├───────────────────────────────┤
│ ○○○○○ | B  A- A+              │
│ 🖍 ■■■■ ⌫ | 📖 ˄ ˅ ‹ ›        │
├───────────────────────────────┤
│ 33 Mas continuem buscando...  │
└───────────────────────────────┘

DEPOIS
┌───────────────────────────────┐
│ ⠿  Mateus 6:33     [Aa] [⋯] [✕]│  ← título inteiro
├───────────────────────────────┤
│ 33 Mas continuem buscando     │
│ primeiro o Reino e a sua      │
│ justiça...                    │
└───────────────────────────────┘

Toque em [Aa] → mini régua vertical
              ┌───┐
              │ + │  ↑ aumenta
              │ ● │  (arrastar para cima/baixo)
              │ − │  ↓ diminui
              └───┘  some sozinha após 2 s

Toque em [⋯] → menu
        ┌────────────────────────┐
        │ 📋 Copiar              │
        │ 📝 Inserir no esboço   │
        │ 🎨 Aparência (fundo, B)│
        │ ⌫ Limpar destaques     │
        │ ─────────────────────  │
        │ 📖 Mais opções ›       │  ← capítulo inteiro,
        └────────────────────────┘     anterior/seguinte

Ao selecionar uma palavra ou trecho:
│ Mas continuem [buscando primeiro] │
│        ┌─────────────────┐        │
│        │ ● ● ● ● ●   ⌫   │        │ ← bolinhas pequenas
│        └─────────────────┘        │   flutuando perto do trecho
```

## O que muda

1. Topo: fica o arrastar (⠿), sai o 📖, o título aparece inteiro, entram [Aa] e [⋯].
2. [Aa]: mini régua de fonte. Para cima/direita aumenta, para baixo/esquerda diminui. Usa o mesmo tamanho já salvo hoje.
3. [⋯]: junta Copiar, Inserir no esboço (só aparece dentro de esboços), Aparência e Limpar destaques.
4. Botões de "ler capítulo inteiro", versículo anterior/seguinte e capítulo anterior/próximo ficam ocultos. Sugestão: em vez de apagar, ficam dentro de "Mais opções" no menu, para quem precisar um dia.
5. Destaque: as bolinhas coloridas só aparecem quando há trecho selecionado, numa pequena barra flutuante. Tocar numa cor pinta só o trecho. O ⌫ apaga o destaque daquele trecho.

## Mais sugestões para menos distração
- Tocar num trecho já destacado abre a mesma barrinha, para trocar a cor ou apagar.
- Tocar duas vezes no título fecha o balão (opcional; o ✕ continua).
- A barrinha de destaque some ao rolar o texto.

## Junto nesta mesma rodada (já combinados)
- Citações com ";": em "Provérbios 22:11; 23:1", o 23:1 também vira link para Provérbios.
- Topo do Leitor da Bíblia mostra o intervalo: "Gênesis 1:1-31".
- Leitor da Bíblia no celular volta a destacar só o trecho selecionado (mesma proteção que o balão já usa).
- "Ajuda" atualizada com o novo topo do balão, a régua de fonte e as bolinhas de destaque.

## Detalhes técnicos
- `BibleVersePopover.tsx`: remover `BookOpen`; manter `GripHorizontal` e handlers de arrasto; trocar Copy/Insert/SlidersHorizontal por botão `Aa` (popover com régua usando `changeTextScale`, gesto por pointer delta) e `DropdownMenu` (Copiar, Inserir, Aparência abre o bloco de cores/negrito atual, Limpar, submenu de navegação com os botões existentes). Bloco de destaque vira barra flutuante condicionada à seleção salva (`savedRangeRef`/`selectionchange` já existentes); `keepSelection` mantido nas bolinhas. Configurações continuam em `bible-view-settings.ts`, sem mudar formato.
- `bible-refs.ts`: herança de livro após ";" + testes em `bible-refs.test.ts`.
- `CleanReader.tsx`: cabeçalho com intervalo de versículos; portar `selectionchange` + range salvo; teste da lógica de intervalo.
- `help-content.ts` + `pt.json`: novos textos; `help-content.test.ts` valida as chaves.
- Sem mudança no banco, login, versão ou nos destaques salvos. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
