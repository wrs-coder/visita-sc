## Problema

Citações em português com acento (`João 2:1`, `1 João 4:8`, `2 João`, etc.) não disparam o popover, mas as mesmas referências sem acento (`Joh 2:1`, `1Jo 4:8`) funcionam.

## Causa

Em `src/lib/bible-refs.ts`, a função `compile()` constrói a regex de detecção a partir dos aliases do `CANON`. Esses aliases já são normalizados sem acento em `bible-canon.ts` (`normalizeName` → `stripDiacritics`), então o padrão final contém literalmente `joao`, `mateus`, `colossenses`, etc.

A regex é então aplicada com `re.exec(text)` sobre o **texto original** (com acentos). Como `joao` ≠ `João`, o match falha em qualquer nome português acentuado. Por isso só funcionam abreviações ASCII (`Joh`, `1Jo`, `Mt`).

O lookup posterior já normaliza via `stripDiacritics`, então basta o regex casar — o resto do pipeline está correto.

## Correção (1 arquivo)

**`src/lib/bible-refs.ts`** — tornar o regex insensível a acentos sem alterar o índice de lookup:

1. Adicionar helper `accentInsensitivePattern(term)` que percorre cada caractere do alias e, para vogais e `c`/`n`, emite uma classe de caracteres aceitando as variantes acentuadas:
   - `a` → `[aáàâãä]`
   - `e` → `[eéèêë]`
   - `i` → `[iíìîï]`
   - `o` → `[oóòôõö]`
   - `u` → `[uúùûü]`
   - `c` → `[cç]`
   - `n` → `[nñ]`
   - espaço → `\s+` (já é o caso na prática; manter)
   - outros caracteres → `escapeRegex(char)`

2. Substituir as duas chamadas `escapeRegex(term)` (em `longParts` e `shortParts`) por `accentInsensitivePattern(term)`.

3. Atualizar os "boundary chars" do regex externo para também aceitar maiúsculas acentuadas (`ÁÉÍÓÚÂÊÎÔÛÃÕÇÑÜ`) — hoje só lista minúsculas, o que pode quebrar boundaries quando a citação vem logo após uma palavra com maiúscula acentuada. Adicionar essas letras às duas classes negadas `[^a-z…0-9]`.

4. Em `dissect()`, a regex `^(.+?)\.?\s*(\d…)` continua funcionando com acentos (usa `.`), então não precisa mudar. O `resolveBookId`/`findCitations` já chamam `stripDiacritics` antes do `lookup.get`, logo o match de "João" → bucket `B43` continua válido.

5. (Sanity) Garantir que o `CACHE: WeakMap` segue válido — não há mudança na assinatura.

## Validação

Após o build:
- Digitar `João 2:1`, `Mt 6:33`, `1 João 4:8`, `2 João 5`, `Colossenses 3:14`, `1 Pedro 2:9` no campo de Considerações de Campo.
- Todos devem virar link sublinhado azul que abre o popover com o versículo.
- Abreviações ASCII existentes (`Joh 2:1`, `1Jo`) devem continuar funcionando.
- Não deve haver regressão em referências sem acento (`Genesis 1:1`, `Mt 5:3`).

Nenhuma mudança no parser EPUB ou na store — o problema é puramente de detecção textual.
