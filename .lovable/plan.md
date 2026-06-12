## Objetivo
Na aba "Esboço Pessoais" (rota `/consideracoes-campo`), no editor de esboço, fazer com que **somente o campo "Conteúdo" tenha rolagem própria**. Todo o cabeçalho (modo edição/esboço, data, período, título, oração, território, dirigentes/descrição, versículos detectados) fica **fixo no topo**, podendo apenas ser **minimizado/expandido** pelo botão já existente (`metaCollapsed`). A barra de ações inferior continua fixa no rodapé.

## Comportamento esperado
- Ao rolar dentro do esboço, **só o conteúdo rola**; cabeçalho e rodapé permanecem visíveis.
- O cronômetro (label "Conteúdo" + `OutlineTimer toolbar`) fica colado **no topo da área de conteúdo** (não some).
- Botão de minimizar continua reduzindo o bloco de metadados — quando minimizado, sobra ainda mais espaço para o conteúdo.
- Modo tela cheia permanece inalterado.
- Sem mudanças visuais nos tokens de cor; apenas layout (flex + alturas).

## Mudanças técnicas (apenas frontend)
Arquivo: `src/routes/_app.consideracoes-campo.tsx`

1. **Container raiz do editor** (linha ~1796) deixa de ser fluxo vertical comum e vira **coluna flex de altura limitada**:
   - Substituir `space-y-4 pb-24` por `flex flex-col h-[calc(100dvh-var(--app-header-h,8rem))] min-h-0`.
   - Remover `pb-24` (o rodapé não é mais sticky-na-página, e sim parte do flex).
   
2. **Header bar** (linhas 1797–1846, toggle modo/Saving/Minimizar/Fullscreen): envolver em `<div className="shrink-0">` para nunca encolher nem rolar.

3. **Bloco de metadados** (linhas 1850–1994, `grid gap-3 ...`): envolver em `<div className="shrink-0">`. O `Collapsible` lógico atual (`!metaCollapsed && ...`) continua igual — minimizar/expandir já funciona.

4. **Área de Conteúdo** (linhas 1996–2026): vira o **único filho que cresce e rola**:
   - Wrapper: `flex-1 min-h-0 flex flex-col`.
   - O header sticky interno (label "Conteúdo" + Timer, linha 1998) passa de `sticky top-0` (que dependia do scroll da página) para `shrink-0` simples — ele já está no topo do contêiner rolável.
   - O `RichNoteEditor` / preview ganha `flex-1 min-h-0 overflow-y-auto` e perde `min-h-[240px]` / `maxHeight` interno conflitante. Para o modo `edit`, passar `minHeight="100%"` e `className="flex-1 min-h-0"`; o `RichNoteEditor` já é `overflow-y-auto` internamente — basta deixar ele crescer.

5. **Action bar inferior** (linha 2031): deixa de ser `sticky bottom-0` e vira `shrink-0 border-t -mx-5 px-3 sm:px-5 py-3 bg-background/95 ...` (último filho do flex coluna). Continua sempre visível porque o pai tem altura fixa.

6. **Ancestrais** (linhas 1346 e contêiner de aba): verificar que não há `overflow` extra bloqueando `100dvh`. Se necessário, ajustar o wrapper de aba para `flex-1 min-h-0` para que a altura do editor resolva corretamente em mobile (390px atual do usuário).

## Validação
- `bunx tsc --noEmit` limpo.
- Em mobile (390×845): rolar dentro do conteúdo mantém timer, título e botões visíveis.
- Botão "Minimizar cabeçalho" continua escondendo data/período/título/oração/etc.
- Modo `outline` (leitura) e `edit` (RichNoteEditor) ambos rolam internamente.
- Tela cheia (`isFullscreen`) inalterada.
- Sem novos tokens, sem hex inline, sem mudanças de Supabase.