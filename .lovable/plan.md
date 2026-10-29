# Importar notas bíblicas do JW Library para "Pontos altos"

## Avaliação do plano anexado

Funciona de forma estável, com 5 ajustes:

1. **Arquivo de teste chegou vazio (0 bytes).** Antes de fechar, preciso de um novo envio do `.jwlibrary` para validar com dados reais.
2. **O versículo não fica em `Location`.** Em `Note`, o campo `BlockType = 2` e `BlockIdentifier` dão o versículo. Notas presas só ao capítulo entram como "Gn 12". Faixas (12:1-3) vêm de `UserMark` + `BlockRange`, quando houver.
3. **Filtro mais seguro:** além de livro 1-66, exigir `Location.KeySymbol` de Bíblia (nwt, nwtsty, etc.) e `IssueTagNumber = 0`. Assim notas de revistas que citam um livro não entram.
4. **Só notas com texto.** As marcações coloridas sem nota não trazem o texto do versículo, então não entram. Isso respeita a regra "só TNM via EPUB".
5. **Sem duplicar:** cada nota usa o `Guid` do JW Library como identificador. Se você importar o mesmo backup de novo, o app atualiza a nota em vez de repetir.

Sugestão melhor: o botão fica dentro do próprio "Pontos altos" (ícone ⤒ Importar), e não em uma tela separada. Funciona igual para você e para a esposa.

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
- As notas entram no "Pontos altos" já existente (mesmo formato de hoje: referência, livro, texto, data). Nada que já existe é alterado.
- Funciona no superintendente (Estudo e Anotações) e na esposa, porque os dois usam a mesma tela.

## Detalhes técnicos

- `src/lib/jwlibrary-import.ts`: JSZip abre o zip; checagem de tamanho (≤ 50 MB zip, ≤ 200 MB descompactado), `manifest.json` e `userData.db` obrigatórios.
- `sql.js` com WASM servido localmente (asset do app, sem CDN), carregado sob demanda via `import()` só ao abrir o importador, para não pesar a abertura do app nem o SSR.
- Query: `Note JOIN Location` com `BookNumber 1-66`, `ChapterNumber` válido, `KeySymbol LIKE 'nwt%'`, `IssueTagNumber=0`, `Content` ou `Title` não vazio. Versículo por `BlockIdentifier`; faixa por `UserMark/BlockRange` se ligada.
- Conversão: `BookNumber` -> `B01..B66`; `ref` com a abreviação já usada no app; `text` = Título + Conteúdo em texto simples (sem HTML); `date` = `LastModified`; `id` = `jw-<Guid>`.
- Upsert por `id` no `highlights` da área de trabalho local; respeita o limite atual de 5000.
- Tolerância a versões do esquema: se uma coluna faltar, a consulta cai para a versão mínima (sem faixa).
- Testes: conversão de livros, referência com/sem versículo, filtro de não-Bíblia, deduplicação, arquivo inválido. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
- Nenhuma mudança no banco de dados nem em login.
