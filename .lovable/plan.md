# Recuo de primeira linha igual ao Word (Esboços Pessoais)

## Por que as tentativas anteriores falharam (confirmado no código)
O recuo de primeira linha é perdido em **três pontos diferentes**, e consertar só um deles não muda nada na tela:

1. **Colagem do Word** (`word-paste-cleaner.ts`, `normalizeIndent`): o recuo de primeira linha (`text-indent`) é **somado** ao recuo do bloco e vira `margin-left`. Tab no começo do parágrafo também vira recuo de bloco.
2. **Importação .docx** (`docx-import.ts`): lê corretamente o `w:firstLine` do Word, mas entrega ao mesmo limpador do item 1, que o transforma em bloco.
3. **Editor** (`RichNoteEditor.tsx`, extensão `indent`): mesmo que chegasse certo, ele lê `max(margem, primeira linha)` e grava só `margin-left`. Não existe um "lugar" no editor para guardar o recuo de primeira linha, então ele sempre some ao salvar.

Além disso, a exportação para Word (`docx-export.ts`) só conhece o recuo de bloco.

## O que será feito

```text
HOJE                                DEPOIS (igual ao Word)
┌──────────────────────────────┐    ┌──────────────────────────────┐
│     15 Algumas pessoas dão   │    │     15 Algumas pessoas dão   │
│     mais importância à       │    │ mais importância à limpeza   │
│     limpeza do que outras.   │    │ do que outras. A noção que   │
│     A noção que temos...     │    │ temos de limpeza é...        │
└──────────────────────────────┘    └──────────────────────────────┘
```

Barra de ferramentas do editor (um botão novo, ao lado dos de recuo):
```text
┌──────────────────────────────────────┐
│ B  I  U  •  1.  ⇤  ⇥  [¶→]  ...      │
│                        └ Recuo da    │
│                          1ª linha    │
└──────────────────────────────────────┘
 Toque: liga/desliga no parágrafo onde está o cursor
 (ou em todos os parágrafos selecionados).
```

### 1. Editor guarda os dois recuos separados
- Novo atributo no parágrafo: **recuo da 1ª linha** (0 a 4 degraus de 32px), gravado como `text-indent`.
- O recuo de bloco atual (0–8, `margin-left`) continua exatamente como está.
- Os dois podem coexistir (ex.: bloco recuado + 1ª linha ainda mais recuada).
- Notas antigas abrem iguais: quem não tem `text-indent` continua com o recuo de bloco de sempre.

### 2. Colagem e importação do Word preservam o tipo de recuo
- `text-indent` positivo do Word → recuo da 1ª linha (não soma mais à margem).
- Margem esquerda do Word → recuo de bloco (como hoje).
- Recuo deslocado/negativo (listas, "hanging") → mantém o comportamento atual (bloco), para não quebrar esboços oficiais.
- Esboços oficiais com classes `Indent0..N` e listas → **sem mudança** (continuam virando degraus de bloco).
- Tab no começo do parágrafo: no Word, Tab só empurra a 1ª linha. Passa a virar recuo da 1ª linha **somente quando o parágrafo não tem classe de nível nem lista**; nos esboços oficiais segue como hoje.

### 3. Leitura e exportação acompanham
- Leitores/visualizações (`rich-content.tsx`) já aceitam `text-indent` — só garantir que não é removido.
- Exportação .docx grava `w:firstLine`, para que o arquivo reimporte igual (ida e volta).

### 4. Notas já salvas com recuo de bloco
- O botão **[¶→]** também serve para corrigir notas antigas: selecione os parágrafos e toque — o recuo de bloco é trocado por recuo da 1ª linha. Nada é convertido automaticamente.

## O que NÃO muda
Banco de dados, sincronização, formato salvo das notas antigas, botões ⇤/⇥, listas, tópicos recolhíveis, detecção de referências bíblicas, Mini tempo, demais telas.

## Detalhes técnicos
- `RichNoteEditor.tsx`: novo atributo global `firstLine` em paragraph/heading (`parseHTML` lê `text-indent` positivo; `renderHTML` emite `text-indent: Npx`); `parseHTML` do `indent` passa a ler **só** margin/padding (sem `max` com textIndent); comando `toggleFirstLine` que, se `firstLine=0` e `indent>0`, migra o degrau de bloco para firstLine.
- `word-paste-cleaner.ts` `normalizeIndent`: separar `ti>0` em `text-indent:${steps*32}px` (steps = round(ti/48), máx 4); `ti<0` mantém regra atual; `x-tab-indent` vindo de `convertLeadingWhitespace` sem `x-level`/lista vira firstLine. Atualizar regra correspondente em `AGENTS.md` (formato único: margin-left em 32px + text-indent em 32px).
- `docx-import.ts`: sem lógica nova além de continuar emitindo `text-indent`; teste de ida e volta.
- `docx-export.ts`: ler `text-indent` → `<w:ind w:firstLine=…>` (720 twips por degrau de 32px, mesmo fator atual).
- Testes (vitest) novos: colagem com `text-indent` gera firstLine e não margem; JW Indent2 inalterado; Tab inicial em parágrafo comum vira firstLine; .docx com `w:firstLine` importa como firstLine; export→import preserva; nota antiga com margin-left abre igual.
- Validação: `bunx tsgo --noEmit`, `bunx vitest run`, Playwright colando HTML do Word no editor (393px e 1280px) e conferindo o recuo só na 1ª linha, inclusive após salvar e reabrir.

---

# Parte 2 — Bíblia: versículos a mais no fim do capítulo 1 de TODOS os livros

## Causa confirmada com os arquivos enviados
Cada livro da TNM tem um arquivo próprio "Conteúdo do livro" (ex.: "Conteúdo de Rute"). Nele há uma lista com um item por capítulo, e cada item é um número em negrito com link (1, 2, 3...) seguido dos tópicos com "(1, 2)", "(3-6)". O padrão é o mesmo em português, inglês e espanhol.
- O leitor confunde esse arquivo com o texto do capítulo 1 e trata cada número de capítulo como se fosse um versículo.
- O filtro atual procura parágrafos com dois ou mais parênteses. Aqui cada tópico tem só um parêntese, por isso nada é barrado.
- **Resultado:** quando o livro tem mais capítulos do que o capítulo 1 tem versículos, sobram versículos falsos (Oseias: 14 capítulos e 11 versículos, então aparecem 12, 13 e 14).
- **Mais grave:** nos números 1 a N, vence o texto mais longo. Versículos verdadeiros e curtos do capítulo 1 podem ter sido trocados pelo texto dos tópicos sem você perceber.
- O outro arquivo, a tabela de capítulos ("w_navigation"), também precisa ser ignorado de forma explícita.

## O que será feito
1. **Na importação:** ignorar por completo os arquivos de "Conteúdo do livro" (lista com classe "outline" e itens "chapterNo") e as tabelas de navegação ("w_navigation"). A identificação é pela estrutura do arquivo, e não por palavras, então funciona em todos os idiomas.
2. **Segunda trava:** números dentro de listas de esboço ou de navegação nunca contam como versículo, mesmo se aparecerem dentro de outro arquivo.
3. **Bíblias já importadas:** o app percebe sozinho quando a Bíblia guardada tem esses versículos falsos e mostra o aviso "Sua Bíblia precisa ser importada de novo para corrigir o capítulo 1", com o botão **Reimportar**. Até lá, os versículos com formato de tópico ficam escondidos no balão e no leitor. Só a reimportação recupera um versículo verdadeiro que foi trocado. Destaques, notas e leituras não são apagados.
4. **Conferência de quantidade:** uma tabela só com números (quantos versículos tem cada capítulo, sem texto bíblico). Depois de importar, o app compara e mostra quantos capítulos ficaram diferentes.

## Detalhes técnicos
- `epub-bible-parser.ts`: `isBookOutlineDoc(doc)` (`ul.outline`, `li.chapterNo` ou `.w_navigation`) retorna `[]` em `extractVersesFromDoc`; o laço de marcadores pula elementos com `hasNoisyAncestor` (a classe outline já está em NOISY_CLASS_RE, mas só era usada em `textBetween`).
- `isOutlineLikeVerse(text)` aplicado na leitura (`getChapterFromLibrary`) sem gravar no IndexedDB; detecção de Bíblia afetada pela contagem de capítulo 1 maior que a esperada ou por versículo com formato de tópico.
- `bible-verse-counts.ts`: apenas números; relatório no BibleManagerDialog.
- Testes com os dois arquivos enviados como fixtures: o arquivo de conteúdo gera 0 versículos e a tabela de navegação gera 0; um livro sintético com 14 capítulos fica com o capítulo 1 exato, sem nenhum versículo trocado; os testes atuais do parser e de idioma continuam passando.
