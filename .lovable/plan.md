# Importação do Word (recuo, negrito, destaque) + barra de ferramentas mais rápida

## O que encontrei no seu arquivo (S-319-27_T_002.docx)

Simulei a importação do arquivo aqui e comparei com o Word.

1. **Recuo.** O Word não usa "recuo de primeira linha" neste arquivo. Ele usa o **recuo deslocado**: a primeira linha começa mais à esquerda e as linhas seguintes ficam mais para dentro. Esse recuo vem dos estilos do modelo (JW Indent 0, 1, 2…). O app hoje lê só o nível do estilo e **descarta o deslocamento**. Por isso o parágrafo inteiro fica alinhado no mesmo recuo.
2. **Negrito nos textos bíblicos.** A leitura do arquivo **mantém** o negrito ("[**Leia Provérbios 18:24.**]"). Então ele se perde depois, quando o texto entra no editor. A causa ainda não foi confirmada: a primeira etapa é reproduzir isso na tela.
3. **Destaque (marca-texto).** Este arquivo não tem nenhum trecho com marca-texto. Mesmo assim, o importador **não lê** marca-texto nem sombreamento do Word. Hoje ele lê só negrito, itálico, sublinhado e cor.

```text
WORD (como deve ficar)            VISITA SC HOJE
┌──────────────────────────┐      ┌──────────────────────────┐
│ Davi [Imagem 1]          │      │ Davi [Imagem 1]          │
│   Jeová valorizava a     │      │   Jeová valorizava a     │
│     pessoa que Davi era  │      │   pessoa que Davi era    │
│     (1Sa 16:6, 7)        │      │   (1Sa 16:6, 7)          │
│   [Leia Prov 18:24.]     │      │   [Leia Prov 18:24.]     │
│    ^^^^ negrito          │      │    sem negrito           │
└──────────────────────────┘      └──────────────────────────┘
```

## Parte 1 — Importação do Word

1. **Recuo deslocado:** passar a ler o deslocamento dos estilos e de cada parágrafo, junto com o recuo de primeira linha. Isso vale também para estilos que herdam de outro estilo, como o "JW Indent 1", que herda do "JW Indent 0". Os níveis JW Indent continuam como hoje: muda só a forma das linhas seguintes.
2. **Mostrar o recuo deslocado no editor:** o recuo da 1ª linha já existe. Será acrescentado o deslocado, guardado no próprio parágrafo e com degraus de 32px, igual aos outros recuos. Na tela, o botão "1ª linha" passa a ter três estados: Nenhum → 1ª linha → Deslocado.
3. **Negrito:** primeiro, reproduzir na tela com o seu arquivo e achar o passo exato em que o negrito some. Depois, corrigir só esse passo. O reconhecimento de citações bíblicas e o balão não mudam: o negrito fica por fora do link da citação.
4. **Marca-texto:** ler o marca-texto e o sombreamento do Word e convertê-los na cor de destaque do editor (amarelo, verde, azul, rosa…). Cores desconhecidas viram amarelo.
5. **Exportar para Word:** gravar de volta o deslocado e o marca-texto, para que o arquivo exportado seja importado igual.
6. **Notas antigas:** não mudam. O deslocado só aparece em importações novas ou quando você aplica o recuo.

## Parte 2 — Barra de ferramentas do modo edição

Hoje, ações básicas ficam dentro de grupos. Negrito, marca-texto, lista e recuo pedem 2 a 3 toques. Proposta no estilo One UI/iOS: uma linha fixa com o que mais se usa, e o restante numa folha que sobe de baixo.

```text
BARRA FIXA (1 toque, rola para o lado se faltar espaço)
┌─────────────────────────────────────┐
│ ↶  ↷ │ B  I  U  🖍 │ •≡  ⇤  ⇥  ↦ │ Aa  ⋯ │
└─────────────────────────────────────┘
 desfazer  formatação  lista/recuos  estilos/mais
 🖍 = último marca-texto usado (segurar = escolher cor)
 ↦  = 1ª linha / deslocado

TOQUE EM "Aa"  (folha curta)       TOQUE EM "⋯"  (folha completa)
┌─────────────────────────────┐    ┌─────────────────────────────┐
│ ───                         │    │ ───                         │
│ Estilo                      │    │ Texto                       │
│ [Normal][Título][Subtítulo] │    │ [x₂][x²][Fonte][Cor][Limpar]│
│ [Citação]                   │    │ Parágrafo                   │
│ Tamanho  A-  16  A+         │    │ [⫷][≡][⫸][☰] [1.][☑]       │
│ Cor  ● ● ● ● ●              │    │ Inserir                     │
└─────────────────────────────┘    │ [Foto][Vídeo][Link][Tabela] │
                                    │ [Linha][Tópico c/ tempo]    │
                                    └─────────────────────────────┘
```

- Negrito, itálico, sublinhado, marca-texto, lista e recuos passam a ficar a **1 toque**.
- O botão aceso mostra o estado do trecho atual, como hoje.
- Nenhuma função some: tudo o que existe hoje continua na barra fixa, em "Aa" ou em "⋯".
- Os botões têm 44px, o mínimo do iOS para toque com o dedo. A folha fecha ao arrastar para baixo.
- O teclado não fecha ao tocar nos botões, como hoje.

### Barra fixa escolhida por você
Cada usuário escolhe quais botões ficam na barra fixa e em que ordem. Os outros continuam em "⋯".

```text
⋯  →  "Personalizar barra"
┌─────────────────────────────┐
│ Cancelar  Barra fixa    OK  │
│─────────────────────────────│
│ NA BARRA (arraste ≡)        │
│ ⊖  B  Negrito            ≡  │
│ ⊖  🖍 Marca-texto        ≡  │
│ ⊖  ⇥  Aumentar recuo     ≡  │
│─────────────────────────────│
│ DISPONÍVEIS                 │
│ ⊕  x² Sobrescrito           │
│ ⊕  🔗 Link                   │
│ ⊕  ▦  Tabela                │
│─────────────────────────────│
│ Restaurar padrão            │
└─────────────────────────────┘
```
- "Desfazer", "Aa" e "⋯" ficam sempre na barra, para você nunca perder o acesso.
- A escolha fica guardada neste aparelho e em cada conta. O padrão é a barra mostrada acima.

## Detalhes técnicos

- `docx-import.ts`: `StyleInfo` passa a ter `firstLine` e `hanging`, herdados via `basedOn`. Os parágrafos com nome "indent N" também passam a emitir `x-hang`/`text-indent` negativo, e o parágrafo vale mais que o estilo. `runsToHtml` passa a ler `w:highlight` e `w:shd@fill` → `<mark data-color>`, numa lista fixa de cores.
- `word-paste-cleaner.ts`: `normalizeIndent` aceita `text-indent` negativo → `hangLevel` 1–4 (32px), sem quebrar a regra de nível existente.
- `first-line-indent.ts` + `RichNoteEditor.tsx`: atributo `firstLine` com valores positivos (1ª linha) e negativos (deslocado: `padding-left` + `text-indent` negativo). `nextFirstLine` faz o ciclo de três estados. Os HTML antigos continuam iguais.
- Negrito: reproduzir com Playwright (importar o .docx, ver o HTML do editor). Suspeitos: a marca de citação bíblica sem `excludes` correto ou o `sanitizeNoteHtml`. A correção será feita só depois da causa confirmada.
- `docx-export.ts`: `w:ind w:hanging` e `w:highlight`. Teste de ida e volta.
- `RichNoteToolbar.tsx`: reorganizar em barra fixa + `Sheet` (shadcn, bottom) para "Aa" e "⋯", reaproveitando os mesmos comandos. Nenhum comando novo além do marca-texto rápido, cuja última cor fica guardada no aparelho (localStorage).
- Testes: fixture com trechos do seu arquivo. Eles conferem o deslocado nos níveis 0–2, o negrito em "Leia Provérbios", o marca-texto, a ida e volta pela exportação e os testes atuais do balão e das citações.
- Personalização: catálogo único de botões (id → ícone, rótulo, comando, estado ativo). A barra lê a lista de ids salva em localStorage por usuário/código de convidado. Ids desconhecidos são ignorados e uma lista vazia volta ao padrão. O editor de ordem usa `@dnd-kit` se já estiver instalado; se não estiver, usa as setas ↑/↓.
- Registrar em AGENTS.md a regra do recuo deslocado.
