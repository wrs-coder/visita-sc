# Plano — Mobile fixes Esboços Pessoais

Escopo 100% UI no arquivo `src/routes/_app.consideracoes-campo.tsx` (+ pequeno ajuste no `OutlineTimer.tsx` e i18n). Sem mexer em backend, lógica de salvamento ou sync.

## 1. Timer (chip da toolbar) cortado no mobile

Sintoma: no chip ao lado do label "Conteúdo", o display MM:SS aparece mas os botões Play/Pause/Reset somem por overflow horizontal.

Causa: o wrapper `flex items-center justify-between gap-2 flex-wrap` permite quebra, mas o chip `rounded-md border bg-muted/40 px-1.5` envolvendo o `OutlineTimer variant="toolbar"` tem largura natural maior que o espaço restante na mesma linha; como ele não pode quebrar internamente, vaza além do `min-w-0`.

Correção:
- Substituir o wrapper por uma estrutura que, no mobile, coloca o timer em linha própria ocupando 100% da largura — algo como `flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between`.
- No chip do timer, adicionar `w-full sm:w-auto overflow-x-auto` e `flex-wrap` interno para permitir que os ícones acomodem.
- No próprio `OutlineTimer.tsx`, na variante `toolbar`, trocar `h-7` fixo por `min-h-7 flex-wrap` e garantir `shrink-0` nos botões e display (já têm) — sem isto, o chip continua estourando quando o usuário aumenta o fonte do sistema.

Resultado: em 390px de largura, o timer ocupa uma linha inteira abaixo do label "Conteúdo", com Play/Pause/Reset todos visíveis.

## 2. Seletor "Consideração de Campo / Esboço / Anotações" desalinhado

Sintoma: no mobile, os 3 botões do segmented control quebram em duas linhas com larguras diferentes — visual "não premium".

Correção (linhas 1359–1398):
- `CardContent` muda para `p-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3`.
- O `<div className="inline-flex rounded-md border …">` vira `flex w-full sm:w-auto rounded-md border bg-background p-0.5` e cada `<button>` recebe `flex-1 sm:flex-none justify-center inline-flex items-center gap-1 whitespace-nowrap text-[11px] sm:text-xs px-2`.
- Mantém os mesmos rótulos (sem trocar i18n) — apenas a tipografia/altura/espaçamento melhoram. Em mobile vira uma barra cheia de 3 colunas iguais; em ≥640px, volta ao layout original compacto.

## 3. Minimizar cabeçalho do esboço (destaque para Conteúdo + Timer)

Comportamento pedido: ocultar/exibir os metadados do esboço para deixar apenas "Conteúdo" + timer em foco.
- Field consideration: oculta de `Dia` até `Dirigentes` (campos `event_date`, `period`, `title`, bloco `syncFromField`, `prayer`, `territory`, `assistants`).
- Outline / Talk notes: oculta de `Título` até `Descrição` (campos `title` e `description`).
- Sempre mantém visível: bloco "Conteúdo" (label + chip do timer + editor/preview) e a sticky bar inferior. Também mantém visível o cabeçalho do editor (breadcrumb / SavingIndicator / botão Tela cheia).

Implementação:
- Novo state local no `OutlineEditor`: `const [metaCollapsed, setMetaCollapsed] = useState(false)`, persistido em `localStorage` (`visita-sc:outline-meta-collapsed`) para sobreviver a navegação.
- Botão de toggle adicionado na barra superior do editor (logo ao lado do `SavingIndicator` / "Tela cheia"), usando `ChevronsUpDown` / `ChevronsDownUp` (lucide), variant `ghost` size `sm`, com `title` traduzido.
- Envolver o bloco `{isField && (…date+period)}` + `<Label>Title</Label>` + `{isField ? prayer/territory/assistants : description}` em `{!metaCollapsed && (…)}`. O bloco "Versículos detectados" (linhas 1953–1971) também entra no colapso, pois só faz sentido quando o cabeçalho/título está visível.
- O bloco "Conteúdo" (linhas 1973–2003) permanece fora do colapso.

## 4. i18n

Adicionar em `personalOutlines.editor` (pt/en/es):
- `collapseMeta` = "Minimizar cabeçalho" / "Collapse header" / "Minimizar encabezado"
- `expandMeta` = "Expandir cabeçalho" / "Expand header" / "Expandir encabezado"

## Arquivos editados

- `src/routes/_app.consideracoes-campo.tsx`
- `src/components/notes/OutlineTimer.tsx`
- `src/i18n/locales/pt.json`
- `src/i18n/locales/en.json`
- `src/i18n/locales/es.json`
- `.lovable/plan.md`

## Garantias

- Zero alteração em chamadas Supabase, store local, ou lógica do timer.
- Tokens semânticos (Onda 6.8) preservados — apenas classes utilitárias de layout.
- `bunx tsc --noEmit` deve fechar 100% limpo.
