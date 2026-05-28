## Ajustes em `src/lib/epub-bible-parser.ts`

A âncora real na TNM tem **espaços** entre `chapter` e o número (uma ou duas, dependendo do arquivo): `id="chapter  1_verse1"`, `id="chapter  2_verse1"`, …, `id="chapter  151_verse1"`.

### 1. `truncatePreChapterContent` (linhas 552-569) — corrigir fallback

O seletor primário `[id^="chapter"][id$="_verse1"]` (linha 558) **já casa** com qualquer quantidade de espaços (começa com "chapter", termina com "_verse1"). Mantido.

O fallback atual `[id="chapter1"]` (linha 564) está morto — o EPUB nunca usa esse formato. Substituir por:

```ts
anchor = body.querySelector('[id^="chapter"]:not([id*="verse"])');
```

Cobre o caso em que algum EPUB ancore só o número do capítulo (`id="chapter 1"`) sem versículo.

### 2. `parseChapVerseFromAttr` (linha 395) — regex aceitar espaços

A regex atual:

```ts
/chapter[_-]?(\d+)[^\d]*verse[_-]?(\d+)/i
```

não casa `chapter  1_verse1` porque `[_-]?` não inclui espaço e só admite um separador. Trocar por:

```ts
/chapter[\s_-]*(\d+)[^\d]*verse[\s_-]*(\d+)/i
```

`[\s_-]*` aceita zero, um ou múltiplos espaços/underscores/hifens entre "chapter"/"verse" e o número. Sem essa mudança, a extração de (capítulo, versículo) a partir do `id` do marcador falha e cai em fallbacks (filename / contexto), o que pode atribuir versículos ao capítulo errado.

### Preservações

- `.groupFootnote` continua em `PURGE_SELECTORS` (linha 506).
- Lógica de subida no DOM (linhas 572-589) intocada.
- `NOISY_CLASS_RE`, `textBetween`, demais regexes de fallback — intocados.
- Sem mudanças em CSS, rotas, componentes.

### Verificação

- `bunx vitest run` — 54/54 testes devem continuar passando.
- Reimportar EPUB da TNM e conferir que os versículos 1 de cada capítulo aparecem corretamente atribuídos.

### Fora de escopo

Nada além desses dois pontos no parser.
