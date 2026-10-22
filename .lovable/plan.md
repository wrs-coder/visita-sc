# Campo "Versículos detectados" nas pesquisas, anotações e leitura da esposa

## O que ela vai ver
- No modo **Editar**, um quadro **"Versículos detectados"** aparece logo abaixo da área de escrever. É o mesmo quadro dos esboços pessoais do superintendente.
- Enquanto ela digita (ex.: "Jo 3:16", "Sal. 23:1-3"), cada versículo reconhecido vira um botão nesse quadro.
- Ao tocar no botão, abre o mesmo balão bíblico, com texto, destacar, A-/A+ e copiar.
- O balão também tem a opção de **inserir o texto do versículo** na pesquisa, como nos esboços. O texto entra no fim da pesquisa.
- Abaixo do quadro ficam os versículos abertos recentemente, como nos esboços.
- Se nada for reconhecido, aparece a dica "Digite uma citação (ex.: João 3:16) para visualizar."
- Se não houver Bíblia importada, aparece um convite para importar.
- Isso vale para Pesquisas Pessoais, Anotações e Anotações de leitura, porque todas usam a mesma tela cheia.
- O modo **Ler** continua com os versículos clicáveis no próprio texto.

## O que não muda
- Os esboços do superintendente, a "Semana da Visita" e o banco de dados ficam como estão. Tudo continua salvo só no aparelho.

## Detalhes técnicos
- No `FocusEditor` (`GuestWorkspace.tsx`), calcular com `useMemo`: `findCitations(library.books, stripHtmlForDetection(item.body))`. As duas funções vêm de `@/lib/bible-refs`.
- Renderizar o quadro com o mesmo visual de `_app.consideracoes-campo.tsx` (linhas 2125-2144):
  - `VerseLink` de `@/components/bible/BibleVersePopover`, com `match`, `libraryId` e `onInsert`;
  - `BibleHistoryChips` com `library` e `onInsert`.
- `onInsert` acrescenta o texto ao fim do corpo com `appendPlainTextToNote` (`@/lib/note-content`).
- Nenhum arquivo dos esboços do superintendente é alterado.
