# Leitura da Bíblia: progresso, metas, pontos altos e leitura limpa

## O que ela vai ver na aba "Leitura da Bíblia"
1. **Meta de leitura**: um seletor no topo com três opções.
   - **Ordem dos livros**: de Gênesis a Apocalipse.
   - **Cronológica**: os livros na ordem aproximada dos acontecimentos.
   - **1 ano**: os 1.189 capítulos divididos em 365 dias, com a indicação "Hoje: capítulos X–Y".
2. **Progresso**: uma barra com a porcentagem e o contador "X de 1.189 capítulos".
   - Abaixo, a lista dos livros na ordem da meta escolhida, cada um recolhível e com a sua própria contagem.
   - Dentro de cada livro, uma grade de números de capítulos. Um toque marca ou desmarca.
   - Um botão "Continuar" abre o próximo capítulo não lido.
3. **Pontos altos**: um botão fixo embaixo abre uma gaveta que sobe do rodapé.
   - Cada ponto alto tem a referência (ex.: "Salmo 23:1"), a meditação e a data.
   - Dá para pesquisar pelo texto e filtrar por livro da Bíblia.
   - Cada ponto alto pode ser editado ou apagado.
   - A referência é reconhecida pelo mesmo leitor de citações que já existe, que entende "Jo", "Sl" e outras abreviações.
4. **Leitura limpa (Modo Foco)**: ao tocar num capítulo com nome (ou em "Continuar"), a tela fica só com o texto, que vem da Bíblia EPUB (TNM) que ela já importou.
   - No alto: "Voltar" e o progresso discreto (ex.: "Salmos 23 · 42%").
   - Embaixo: o botão "Concluído", que marca o capítulo e oferece o próximo, e o botão "+ Ponto alto", que já vem com a referência do capítulo preenchida.
   - Se ela ainda não importou a Bíblia, aparece o convite para importar. Mesmo assim ela pode marcar os capítulos como lidos.

As anotações livres de "Leitura da Bíblia" que já existem continuam lá, numa seção "Anotações de leitura" abaixo da grade. Tudo fica só no aparelho, entra no backup .zip e não muda a "Semana da Visita".

## Detalhes técnicos
- **Dados (`guest-workspace-store.ts`)**: `WsData` ganha:
  - `reading: { plan: "canon" | "chrono" | "year"; startDate: string; done: string[] }`, onde `done` guarda chaves `"B19:23"`;
  - `highlights: WsHighlight[]`, com `{ id, ref, bookId | null, text, date }`.
  - O `sanitizeWs` valida tudo: plano conhecido, chaves no formato `B\d\d:\d+` dentro do número de capítulos do livro, tamanhos máximos, até 5.000 pontos altos. Dados antigos sem esses campos recebem valores padrão.
  - Grava no mesmo `saveWs` (IndexedDB por código de convite) e entra no backup automaticamente.
- **Número de capítulos**: novo `src/lib/bible-chapters.ts` com a quantidade de capítulos dos 66 livros (só números, nenhum texto bíblico), a ordem cronológica dos livros e `yearPlanDay(startDate, today)`, que divide a sequência em 365 partes.
- **Componentes novos** em `src/components/guest-workspace/`:
  - `BibleReadingTab.tsx`: seletor, barra (`Progress`), livros recolhíveis e grade de capítulos;
  - `HighlightsDrawer.tsx`: `Drawer` (vaul), formulário e lista com busca e filtro;
  - `CleanReader.tsx`: `fixed inset-0 bg-background`, usa `getActiveLibrary` e `getChapterFromLibrary`, e os nomes dos livros vêm de `getLocalizedBookName`.
- `GuestWorkspace.tsx`: quando `studyTab === "bible"`, mostra `BibleReadingTab` em vez da lista simples, com o mesmo `update`.
- Só cores do tema (`styles.css`) e textos com `t()` + `defaultValue` em português.
- **Testes no vitest**:
  - o `sanitizeWs` descarta capítulo inexistente (ex.: `B19:151`) e plano desconhecido;
  - a porcentagem conta os 1.189 capítulos;
  - `yearPlanDay` no dia 1 começa em Gênesis 1 e no dia 365 termina em Apocalipse 22;
  - o filtro de pontos altos por livro e por texto funciona.
- Conferir com `tsgo` e `vitest`.
