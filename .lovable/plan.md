# Importar notas bíblicas do JW Library para "Pontos altos"

## Avaliação do plano anexado

Funciona de forma estável, com ajustes. Testado com o seu backup do Samsung (9,9 MB):

- 1.339 notas no total; **504 são da Bíblia** (nwtsty 499, nwt 5). As outras (mwb, w, it, be...) ficam de fora.
- 113 das 504 não têm texto escrito, só título (que costuma ser o próprio trecho do versículo). Entram com o título como texto.
- 499 estão presas a um versículo; 5 só ao capítulo.
- 268 têm etiquetas do JW Library; podem virar uma linha "#etiqueta" no texto.

Ajustes ao plano anexado:

1. **O versículo não fica em `Location`.** Vem de `Note.BlockType = 2` + `BlockIdentifier`. Notas só de capítulo entram como "Nm 20".
2. **Filtro seguro:** livro 1-66 **e** `KeySymbol` começando com `nwt`. Assim notas de revistas ou guias que apontam para um livro não entram.
3. **Ponto crítico de estabilidade:** o backup traz um arquivo extra (`userData.db-wal`) com as alterações mais recentes. Se ele for ignorado, notas recentes somem na importação. O leitor vai juntar esse arquivo antes de ler; se não conseguir, avisa em vez de importar pela metade.
4. **Só notas.** Marcações coloridas sem nota (14 mil no seu backup) não têm texto próprio e não entram, o que respeita a regra de usar só o EPUB da TNM.
5. **Sem duplicar:** cada nota usa o `Guid` do JW Library. Importar o mesmo backup de novo atualiza em vez de repetir.
6. Fotos e mídias do backup são ignoradas.

Decisão: as notas importadas ficam numa **pílula própria "JW Library"**, ao lado de "Anotações de leitura" e "Pontos altos". Vantagens:
- Seus pontos altos atuais nunca se misturam nem são alterados.
- As 113 notas só com título aparecem marcadas como "trecho" (título em itálico, sem texto), sem poluir a lista.
- Botão "Remover importação" apaga só o que veio do JW Library.
- Mesma lista por livro e busca que já existem; cada nota tem "Copiar para Pontos altos" se quiser trazê-la.
Funciona igual para você e para a esposa.

## Como fica a tela

```text
+-----------------------------------+
| < Pontos altos           ⤒  [+]  |
+-----------------------------------+
| Importar do JW Library            |
| [ Escolher backup .jwlibrary ]    |
| Backup_2026-10-29 · 1,4 MB        |
|-----------------------------------|
| 38 notas bíblicas · 3 já existem  |
| [x] Todas                         |
| > Gênesis (12)            [x]     |
|   Gn 12:1-3 Promessa...           |
| > Salmos (18)             [x]     |
| > Mateus (8)              [x]     |
|-----------------------------------|
|  [ Importar 35 novas ]            |
+-----------------------------------+
  depois: "35 notas salvas" -> lista
  já filtrada no primeiro livro
```

## O que muda

- Nova leitura do backup só no aparelho, offline, sem enviar nada ao servidor.
- Prévia por livro, com marcar/desmarcar livro ou nota.
- As notas entram na nova pílula "JW Library", com lista por livro, busca e "Remover importação". Os "Pontos altos" atuais não são alterados.
- Funciona no superintendente (Estudo e Anotações) e na esposa, porque os dois usam a mesma tela.

## Detalhes técnicos

- `src/lib/jwlibrary-import.ts`: JSZip abre o zip; checagem de tamanho (≤ 50 MB zip, ≤ 200 MB descompactado), `manifest.json` e `userData.db` obrigatórios.
- `sql.js` com WASM servido localmente (asset do app, sem CDN), carregado sob demanda via `import()` só ao abrir o importador, para não pesar a abertura do app nem o SSR.
- Query: `Note JOIN Location` com `BookNumber 1-66`, `ChapterNumber` válido, `KeySymbol LIKE 'nwt%'`, `IssueTagNumber=0`, `Content` ou `Title` não vazio. Versículo por `BlockIdentifier`; faixa por `UserMark/BlockRange` se ligada.
- Conversão: `BookNumber` -> `B01..B66`; `ref` com a abreviação já usada no app; `text` = Título + Conteúdo em texto simples (sem HTML); `date` = `LastModified`; `id` = `jw-<Guid>`.
- Nova lista local separada `jwNotes` (campo opcional na área de trabalho, mesma validação; backups antigos seguem abrindo), upsert por `id`, limite 5000. `highlights` fica intocado; "Copiar para Pontos altos" cria uma cópia normal.
- Tolerância a versões do esquema: se uma coluna faltar, a consulta cai para a versão mínima (sem faixa).
- Testes: conversão de livros, referência com/sem versículo, filtro de não-Bíblia, deduplicação, arquivo inválido. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
- Nenhuma mudança no banco de dados nem em login.
