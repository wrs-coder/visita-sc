## Objetivo

1. Remover o cartão **"Programação de hoje"** (visit-scoped, redundante com o novo "Hoje no cronograma") e substituí-lo por um **cartão misto** Esboços + Recomendados, com tabs.
2. Adicionar a **TODOS os cartões do dashboard** (super, ancião e esposa) a funcionalidade de **minimizar/expandir** (collapse).

---

## Parte 1 — Cartão misto "Estudos & Notas"

### Escopo confirmado

- **Esboços (aba 1):** união de **locais** (IndexedDB via `listNotesByType("field_consideration")` em `src/lib/bible-notes-store.ts`) **+ nuvem** (`listCloudOutlines()` → `personal_outlines`). Deduplicar por `(title normalizado, |Δupdated_at| < 5min → manter mais recente)`. Ordenar `updated_at DESC`, fatiar `.slice(0, 3)`. Cada item: badge **Local** / **Nuvem**, título, timestamp relativo. Clique → `/consideracoes-campo`.
- **Recomendados (aba 2):** `private_notes` filtradas por `superintendent_id = auth.uid()` **AND** `congregation_id = <congregação ativa do dashboard>` **AND** `note_type = 'recomendados'`, ordem `updated_at DESC`, limite 3. Clique → `/notas`.
- **Remoção total** do bloco `Programação de hoje` (linhas ~935-977 de `src/routes/_app.dashboard.tsx`) e do estado/efeito `todayEvents` se ficar órfão.

### Layout

Tabs do shadcn (`src/components/ui/tabs.tsx`) dentro de um único Card — melhor responsividade em mobile e densidade visual estável em qualquer breakpoint.

```text
┌───────────────────────────────────────────────┐
│ 📄 Estudos & Notas   [–]        [Ver todos →] │
├───────────────────────────────────────────────┤
│ [ Esboços (3) ] [ Recomendados (3) ]          │
├───────────────────────────────────────────────┤
│ • Título do esboço      [Nuvem] · há 2 dias   │
└───────────────────────────────────────────────┘
```

Card aparece **apenas para `role === "superintendent"`**, independente de visita.

---

## Parte 2 — Minimizar/expandir em todos os cartões do dashboard

### Componente reutilizável

Criar **`src/components/dashboard/CollapsibleCard.tsx`** — um wrapper fino sobre `Card` que padroniza:

- Header com **ícone + título** (slot) e ação direita opcional (`headerRight` — para links "Ver todos", badges de não-lido etc.).
- Botão de toggle (ícone `ChevronUp` / `ChevronDown` de `lucide-react`) ao lado do `headerRight`, dentro do header — clicável também ao clicar no próprio header (mesma linha, com `cursor-pointer` e `aria-expanded`).
- Conteúdo (slot `children`) renderizado dentro de uma `<div>` com `aria-hidden` quando recolhido; usar `max-height` + `overflow-hidden` + `transition-all duration-200` para animar; ao recolher, ocultar via `hidden` após a transição para não capturar foco.
- Acessibilidade: `role="button"` no header de toggle, `aria-controls`, `aria-expanded`, suporte a `Enter`/`Space`.
- Props:
  ```ts
  type CollapsibleCardProps = {
    id: string;                       // chave de persistência
    title: React.ReactNode;
    icon?: React.ReactNode;
    headerRight?: React.ReactNode;
    defaultCollapsed?: boolean;
    className?: string;
    children: React.ReactNode;
  };
  ```

### Persistência do estado

- Um **hook** `useDashboardCardCollapsed(id, defaultCollapsed)` em `src/hooks/use-dashboard-card-collapsed.ts` que lê/grava em `localStorage` na chave `visita-sc:dashboard:collapsed:v1` (objeto `Record<string, boolean>`).
- Persistência por usuário do dispositivo (não vai ao banco). Falhas de quota são silenciosas.
- Estado inicial vem do `localStorage`; se ausente, usa `defaultCollapsed` (padrão `false` = expandido).

### Aplicação aos cartões existentes

Migrar **todos** os `Card` do dashboard (super, ancião e esposa — note que esposa não usa `_app.dashboard.tsx`, então este item se aplica apenas ao painel do super/ancião que vive nesse arquivo; para a esposa, ver subitem abaixo) para usar `CollapsibleCard`:

- **`src/routes/_app.dashboard.tsx`:** envolver cada bloco `<Card className="shadow-card">` em `CollapsibleCard` com `id` único (`"super-pending"`, `"super-overdue"`, `"super-active-congregation"`, `"super-today-schedule"`, `"super-couple-messages"`, `"super-study-notes"`, `"elder-…"`, `"visit-active"` etc.). Mover o header atual (ícone + título) para o slot `title`/`icon`; mover links "Ver todos" e badges para `headerRight`. Manter classes utilitárias e o conteúdo intacto.
- **Esposa (`src/routes/visitante.painel.tsx`):** verificar se há cartões equivalentes ao "dashboard" da esposa (visão inicial / resumo). Se sim, aplicar `CollapsibleCard` aos cartões dessa tela. Confirmar com `rg "shadow-card" src/routes/visitante.painel.tsx` durante a build.

### Comportamento

- Estado inicial recomendado: **todos expandidos** (`defaultCollapsed: false`), exceto cartões de baixo uso já identificados (nenhum por padrão — manter tudo aberto na primeira visita).
- Toggle individual; sem "minimizar tudo" nesta entrega.
- Animação de altura ≤ 200ms; respeita `prefers-reduced-motion` (desabilita transição).
- Nenhum cartão deve ser ocultado completamente — sempre o header fica visível para reabrir.

### i18n

Adicionar em `pt`/`en`/`es`:
- `dashboard.collapseExpand` ("Expandir/recolher cartão") — usado em `aria-label`.

---

## Detalhes técnicos comuns

### `src/routes/_app.dashboard.tsx`

- Importar `CollapsibleCard` e o hook; importar `listNotesByType` de `@/lib/bible-notes-store` e `listCloudOutlines` de `@/lib/personal-outlines.functions`.
- Estados novos: `outlinesPreview`, `recomendadosPreview`.
- **Esboços:** `Promise.all([listNotesByType("field_consideration"), fnListCloudOutlines()])` → normaliza, dedup, ordena, `slice(0, 3)`. Recarrega no `focus` da janela.
- **Recomendados:** `supabase.from("private_notes").select("id, title, note_date, updated_at").eq("superintendent_id", user.id).eq("congregation_id", selected).eq("note_type", "recomendados").order("updated_at", { ascending: false }).limit(3)`. Recarrega ao mudar `selected`.
- Reordenação visual final do super: **Hoje no cronograma → Recados da esposa → Estudos & Notas → demais cartões existentes**.
- Sem cores fora dos tokens (`text-primary`, `bg-card`, `text-muted-foreground`, `shadow-card`).

### i18n (`src/i18n/locales/{pt,en,es}.json`)

Novas chaves em `dashboard.*`:
- `studyNotesTitle`, `studyNotesOutlinesTab`, `studyNotesRecomendadosTab`
- `studyNotesSourceLocal`, `studyNotesSourceCloud`
- `studyNotesEmptyOutlines`, `studyNotesEmptyRecomendados`
- `collapseExpand`

Remover `dashboard.todaySchedule` / `dashboard.noEventsToday` / `dashboard.fullSchedule` dos 3 locales **apenas** se a varredura `rg` confirmar que não são usados em mais lugar nenhum.

### Banco de dados / RLS

**Nenhuma migração necessária.** Políticas atuais já cobrem `personal_outlines` (`user_id = auth.uid()`) e `private_notes` (`superintendent_id = auth.uid() AND is_superintendent_of(...)`); o filtro `note_type = 'recomendados'` é só uma cláusula extra de leitura.

---

## Conformidade com `instructions.md`

- Mudança 100% frontend/apresentação (sem nova lógica de negócio, sem nova server function, sem migração).
- IndexedDB lido via `listNotesByType` já existente; `listCloudOutlines()` via `useServerFn` (padrão da base).
- Sem cores customizadas — somente design tokens em `src/styles.css`.
- Sem edição de arquivos pré-configurados (`client.ts`, `types.ts`, `routeTree.gen.ts`, `.env`).

## Validação após implementação

- `bunx tsc --noEmit` limpo.
- Preview (super logado): todos os cartões mostram botão de minimizar; estado persiste após F5; aria-expanded correto.
- Cartão "Estudos & Notas" aparece, tabs alternam, badges Local/Nuvem corretos, dedup funcionando, links "Ver todos" navegam.
- Trocar congregação ativa atualiza a aba "Recomendados".
- Antigo "Programação de hoje" não aparece para nenhum papel.
- Esposa (se aplicável) também tem cartões minimizáveis no painel.
