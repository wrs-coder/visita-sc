## Diagnóstico

O log mostra `books=66/66 verses=31956 missing=0`, então a contagem está correta. Os dois problemas restantes são qualitativos:

1. **O popover mostra muito mais texto do que o versículo pedido.** Há duas causas combinadas:
   - O parser (`textBetween` em `src/lib/epub-bible-parser.ts`) caminha por **todos** os nós de texto entre um marcador `<sup>1</sup>` e o próximo, **sem pular** notas de rodapé, referências cruzadas, `<aside>`, `<span class="fn">`, links `<a class="xref">` etc. — tudo isso fica colado dentro do texto do versículo.
   - Quando o **último** marcador de um arquivo é alcançado, o `textBetween` continua até o **fim do `<body>`**, capturando títulos, créditos e apêndices que aparecem após o último versículo.
2. **Citações com intervalo (`Mt 6:33-35`) abrem só o primeiro versículo.** O `VerseLink` em `src/components/bible/BibleVersePopover.tsx` chama `getVerseFromLibrary(... , match.verse)` ignorando `match.verseEnd`. Quando o usuário digita um intervalo, ele vê só `v.33` e tem a impressão de que "o texto está cortado / errado".

A entrada `manifest.webmanifest 401` é independente (PWA carregando no preview autenticado) e não afeta a Bíblia.

## Mudanças

### 1. `src/lib/epub-bible-parser.ts` — limpar o texto do versículo

- **Filtrar nós ruidosos** no `textBetween`: ao caminhar pelo TreeWalker, pular qualquer nó de texto cujo ancestral mais próximo seja:
  - `<aside>`, `<nav>`, `<figure>`, `<figcaption>`
  - um elemento com `epub:type` contendo `footnote|note|rearnote|annotation`
  - um elemento com `class` casando `/\b(fn|footnote|note|xref|cross|crossref|ref|study|caption|byline|callout)\b/i`
  - links `<a>` cujo `href` aponta para um `#fn…` ou `#note…`
- **Parar no próximo cabeçalho de capítulo** além de no próximo marcador, para que o último versículo de um capítulo não absorva títulos/apêndices do capítulo seguinte (quando o arquivo agrupa vários capítulos).
- **Tornar `isVerseMarker` mais rígido**: não considerar marcadores que estejam dentro de uma subárvore de nota/rodapé (mesma lista acima). Isso evita que um `<sup>` de chamada de nota seja contado como início de versículo.
- **Sanity-check de tamanho**: se `text.length > 1200` ou contiver `\n\n` suspeito, truncar no primeiro ponto final após 600 chars e logar via `console.warn("[epub-bible] long verse", bookId, chap, verse, length)` para visibilidade em DEV.

### 2. `src/components/bible/BibleVersePopover.tsx` — suportar intervalos

- Quando `match.verseEnd && match.verseEnd > match.verse`, buscar `verse..verseEnd` em paralelo (`Promise.all` chamando `getVerseFromLibrary` por versículo) e concatenar como  
  `"33  Buscai primeiro… 34  Não vos inquieteis… 35  …"` (número em superscript pequeno + espaço).
- Limitar o intervalo a um teto razoável (ex.: 10 versículos) para evitar consultas exageradas; se exceder, mostrar só `verse` e um rodapé `"Intervalo grande — abrindo apenas o primeiro versículo"`.
- Manter o cabeçalho atual (`Mt 6:33-35`), só o corpo muda.

### 3. (opcional, sem custo) `BibleManagerDialog.tsx`

- Não muda fluxo; apenas ajustar o `toast.warning` para também avisar se algum versículo individual ficou anormalmente longo (contagem vinda do log do parser). Pode ficar para um próximo passo se preferir manter este PR pequeno — sinalizar e seguir sem isso por padrão.

## Validação após implementar

1. Remover a Bíblia atual em **Gerenciar Bíblias** e reimportar o EPUB (a estrutura do texto armazenado muda; reimportar é necessário).
2. No console (F12) confirmar:
   - `[epub-bible] DONE books=66/66 verses≈31102` (deve ficar próximo de 31.102, não mais 31.956 — a queda confirma que estávamos absorvendo notas).
   - Nenhum (ou poucos) `[epub-bible] long verse …`.
3. Em Considerações de Campo, digitar:
   - `Mt 6:33` → popover mostra **apenas** Mateus 6:33.
   - `Mt 6:33-35` → popover mostra os três versículos numerados.
   - `Sl 23:1` e `João 3:16` → texto sem rodapés/cross-refs.

## Observação sobre o 401 do manifest

`manifest.webmanifest:1 401` ocorre porque o preview está atrás de autenticação e o navegador pede o manifest sem credenciais. Não afeta a importação nem a leitura. Some no domínio publicado. Não vou tocar nele neste plano.
