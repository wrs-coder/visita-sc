## Mudança única — `src/lib/epub-bible-parser.ts`

Reescrever a busca de âncora dentro de `truncatePreChapterContent` (linhas 546-570) para usar o padrão universal de versículo 1 de qualquer capítulo. Toda a lógica de subida no DOM removendo `previousElementSibling` (linhas 572-589) **permanece intacta**.

### Nova ordem de tentativa

1. **Primário (dinâmico, novo):** `body.querySelector('[id^="chapter"][id$="_verse1"]')` — captura `chapter1_verse1`, `chapter2_verse1`, ..., `chapterN_verse1`. `querySelector` retorna o primeiro match em ordem de documento, então:
   - Em arquivos que começam no capítulo 1 → pega `chapter1_verse1` (trunca prólogo/cabeçalho).
   - Em arquivos split que abrem em outro capítulo → pega o primeiro versículo presente (também correto).
2. **Fallback (compatibilidade):** `body.querySelector('[id="chapter1"]')` — para EPUBs que ancoram o número do capítulo separado do versículo.
3. **Sem âncora → no-op** (não trunca, como hoje).

O fallback `.w_ch` com texto `"1"` será **removido** — confirmado pelo usuário que o EPUB da TNM não tem esse padrão, então é código morto que só polui.

### Preservações explícitas

- **`.groupFootnote`** continua em `PURGE_SELECTORS` (linha 506). Sem regressão no último versículo de cada capítulo.
- **`NOISY_CLASS_RE`** intocado (poesia preservada).
- **`textBetween` / read-until-next-anchor** intocado.
- Lógica de subida no DOM (linhas 572-589) intocada.

### Verificação

- 54/54 testes devem continuar passando (`bunx vitest run`).
- `console.table` de auditoria permanece ativo para o usuário reimportar e colar resultados.

### Fora de escopo

- Nenhuma mudança em CSS / rotas / componentes.
- Nenhuma mudança em outros pontos do parser.
