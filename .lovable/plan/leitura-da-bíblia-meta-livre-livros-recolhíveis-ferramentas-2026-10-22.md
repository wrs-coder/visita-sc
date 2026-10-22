# Leitura da Bíblia: meta livre, livros recolhíveis, ferramentas no versículo e anotações completas

## O que ela vai ver
1. **Meta "Personalizada"**: uma quarta opção no seletor, ao lado de Ordem dos livros, Cronológica e 1 ano.
   - Ela escolhe quais livros entram (pode marcar todos, só o Novo Testamento ou livros soltos) e define quantos capítulos quer ler por dia, ou uma data para terminar.
   - O "Continuar" e o "Hoje: capítulos X–Y" seguem essa escolha.
   - Se ela não definir ritmo, a meta é livre: só o progresso dos livros escolhidos.
2. **Lista de livros recolhível**: um cabeçalho "Livros da Bíblia (66)" com seta para recolher ou expandir a lista inteira, mais os atalhos "Expandir todos" e "Recolher todos". O aparelho lembra se a lista estava aberta ou fechada.
3. **Ferramentas no versículo (leitura limpa)**: ao tocar num versículo aparece a mesma barra do balão bíblico do superintendente:
   - destacar com as mesmas cores (os destaques são os mesmos do balão, ficam salvos no aparelho);
   - aumentar e diminuir a letra;
   - copiar;
   - novo botão **"Anotar"**: abre a anotação já com a referência e o texto do versículo, e ela é salva direto em "Anotações de leitura".
4. **"Anotações de leitura" igual às anotações do superintendente**:
   - editor com a mesma barra de ferramentas (negrito, cores, listas, recuo, tópicos recolhíveis, citações bíblicas);
   - pastas: criar, renomear, apagar e mover anotações entre pastas;
   - busca e ordenação na lista.
   - As anotações que ela já tem continuam lá e abrem no novo editor sem perder nada.

Tudo fica só no aparelho, por código de convite, e entra no backup .zip. Nada vai para o servidor e a "Semana da Visita" não muda.

## Detalhes técnicos
- `bible-chapters.ts`: `ReadingPlan` ganha `"custom"`; `chapterSequence(plan, custom?)` e `customPlanDay(custom, startDate, today)` (capítulos por dia ou data final).
- `guest-workspace-store.ts`: `WsReading.custom?: { books: string[]; perDay: number | null; endDate: string | null }`, validado no `sanitizeWs` (livros `B\d\d` existentes, perDay 1–50, data ISO). Pastas de leitura reaproveitam `WsFolder` com `kind: "bible"` (campo opcional, dados antigos ficam como gerais).
- `BibleReadingTab.tsx`: quarta opção + diálogo de configuração da meta; cabeçalho recolhível com estado em localStorage (`guest.workspace.booksOpen`), "Expandir/Recolher todos" via `Set` de livros abertos.
- Barra do versículo: extrair do `BibleVersePopover.tsx` a barra de destaque/cores/tamanho para um componente reutilizável (`VerseToolbar`), usado pelo balão (comportamento idêntico) e pelo `CleanReader`. Destaques via `getHighlights`/`addHighlight`/`highlightKey` de `bible-view-settings.ts`; tamanho via configuração existente de escala de letra. "Anotar" cria `WsItem kind:"bible"` com `<blockquote>` da referência + texto e abre o editor.
- Anotações de leitura: trocar a textarea do `FocusEditor` (para `kind:"bible"`) pelo `RichNoteEditor` carregado sob demanda (mesmo usado nos esboços do superintendente), salvando HTML no `body`; textos antigos convertidos com `appendPlainTextToNote`. Lista com pastas no mesmo padrão visual da tela de esboços, mas sobre o armazenamento local da esposa (sem `bible-notes-store` do superintendente, sem banco).
- Só tokens do tema; textos com `t()` + `defaultValue`.
- Testes vitest: sequência da meta personalizada só com livros escolhidos; `customPlanDay` com 3 capítulos/dia; `sanitizeWs` descarta livro inválido na meta personalizada e pasta mal formada; nota criada pelo "Anotar" contém a referência.
- Conferir com `tsgo` e `vitest`.
