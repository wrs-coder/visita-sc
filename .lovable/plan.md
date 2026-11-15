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

## O que acontece (provável, a confirmar com o arquivo real)
A falha aparece em todos os livros, porque cada livro da TNM traz o seu quadro "Conteúdo do livro" junto ao capítulo 1. Oseias é só um exemplo.
O leitor separa os versículos procurando "números marcados" no arquivo da TNM. O quadro "Conteúdo do livro" também tem números marcados: um por capítulo (1, 2 ... 14), cada um com tópicos e referências entre parênteses.
- O filtro atual só reconhece esse quadro quando ele está num parágrafo comum com até 1500 letras. Em livros com muitos capítulos o quadro é maior ou vem em lista, e escapa.
- Os itens 12, 13 e 14 do quadro viram "versículos 12, 13 e 14" do capítulo 1.
- **Risco escondido:** os itens 1 a 11 podem substituir versículos reais curtos do capítulo 1, porque hoje vence o texto mais longo.

## O que será feito
1. **Na importação:** o quadro "Conteúdo do livro" é reconhecido também em listas e blocos grandes. Um número que aponta para outro capítulo, como um link, deixa de contar como versículo.
2. **Trava de segurança:** o texto de um versículo no formato "tópico (1-14) tópico (3)" é descartado, porque esse formato nunca aparece num versículo de verdade.
3. **Bíblias já importadas, sem reimportar:** a mesma trava é aplicada na hora de mostrar o versículo, no balão, no leitor e na busca. Os versículos falsos somem e os destaques salvos continuam como estão.
4. **Conferência de quantidade:** uma tabela só com números (quantos versículos tem cada capítulo, sem nenhum texto bíblico). Ao importar aparece um aviso como "Oseias 1: esperados 11, encontrados 14". Nada é apagado só por causa desse aviso.

## Detalhes técnicos
- `epub-bible-parser.ts`: `findOutlineRoots` inclui `li, ol, ul, td` e, para containers com 3 ou mais filhos que casam com OUTLINE_PAREN_RE, ignora o limite de 1500; `isVerseMarker` rejeita `<a href>` que apontam para `#chapterN` com N diferente do capítulo atual; o dedup deixa de usar "mais longo vence" quando o texto candidato casa com o padrão de esboço.
- Novo `isOutlineLikeVerse(text)` compartilhado (2 ou mais "(n)"/"(n-n)" e nenhuma pontuação de frase), aplicado em `getChapterFromLibrary` (leitura), sem gravar nada no IndexedDB.
- `bible-verse-counts.ts`: só números por livro e capítulo, conforme a regra de não embutir texto bíblico; relatório de importação no BibleManagerDialog.
- Varredura completa após a correção: para os 66 livros, comparar a quantidade de versículos de cada capítulo com a tabela de números e listar qualquer diferença restante.
- Testes: fixtures de livros com poucos capítulos (ex.: Rute, 4), médios (Oseias, 14) e muitos (Salmos, Isaías); fixture XHTML imitando Oseias (quadro em lista com 14 itens) gera exatamente 11 versículos no capítulo 1; nenhum versículo real é substituído; o filtro na leitura remove os 3 falsos de uma Bíblia já salva; os testes atuais do parser e de idioma continuam passando.
- Primeiro passo da execução: se possível, reproduzir com o arquivo EPUB do usuário, sem enviá-lo para a nuvem, para confirmar a causa antes de corrigir.
