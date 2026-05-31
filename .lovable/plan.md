
## Objetivo

Adicionar uma pasta fixa **"Considerações da Semana"** dentro da raiz da subaba **Consideração de campo** (em *Esboços Pessoais*), e atualizar o cartão do dashboard para refletir o novo fluxo, sem quebrar nada do que já funciona (offline, sync, lixeira, IndexedDB).

---

## Ajuste 1 — Pasta fixa "Considerações da Semana"

**Escopo:** apenas a subaba `field_consideration` em `/consideracoes-campo`.

### Estratégia de armazenamento (econômica e local-first)

- A pasta é **virtual e determinística**, não gravada no IndexedDB nem no Supabase.
  - ID reservado, constante: `FIXED_FOLDER_WEEK_CONSIDERATIONS = "__fixed__week-considerations"`.
  - Nome exibido vem do i18n (`personalOutlines.folders.weekConsiderations`).
- Como é virtual, **não ocupa linha no banco**, não entra na lixeira, não sincroniza, não precisa de migration. Para milhares de usuários isso evita N linhas duplicadas no Supabase.
- As **notas dentro dela são reais** (`FieldNote` com `folderId = FIXED_FOLDER_WEEK_CONSIDERATIONS`, `type = "field_consideration"`), seguindo todo o pipeline atual (IndexedDB → fallback localStorage → sync/lixeira existentes).

### Mudanças em `src/lib/bible-notes-store.ts`

- Exportar `FIXED_FOLDER_WEEK_CONSIDERATIONS` e helper `isFixedFolder(id)`.
- `listFolders("field_consideration")`: **injetar** a pasta virtual como **primeira** entrada (parentId=null).
- `saveFolder`, `deleteFolderCascade`, `restoreFolder`, `hardDeleteFolder`: no-op silencioso para a pasta fixa.

### Mudanças em `src/routes/_app.consideracoes-campo.tsx`

- Árvore (apenas `field_consideration`): pasta fixa sempre como primeira, ícone destacado (`FolderOpen` + `text-primary`) + badge "Fixa".
- Esconder ações **renomear** e **excluir** no dropdown se `isFixedFolder(folder.id)`.
- Permitido: criar nota dentro, mover notas para/dela, recortar/colar, exportar pasta.
- Diálogo "Mover para…" lista a fixa como destino válido.
- Não aparece na subaba `outline`.

### i18n (`src/i18n/locales/{pt,en,es}.json`)

```
personalOutlines.folders.weekConsiderations = "Considerações da Semana"
personalOutlines.folders.fixedBadge = "Fixa"
```

---

## Ajuste 2 — Dashboard: cartão "Esboços e Notas"

### Renomes (i18n)

- `dashboard.studyNotesTitle`: "Estudos & Notas" → **"Esboços e Notas"**
- `dashboard.studyNotesOutlinesTab`: "Esboços" → **"Considerações de campo"**
- Manter `studyNotesRecomendadosTab`.

### Conteúdo da aba "Considerações de campo" (em `_app.dashboard.tsx`)

Trocar a fonte de dados de `outlinesPreview`:

- **Antes:** mistura local (`field_consideration` qualquer) + cloud outlines + dedup.
- **Depois:** apenas notas locais da pasta fixa:
  ```ts
  listNotesByType("field_consideration", FIXED_FOLDER_WEEK_CONSIDERATIONS)
  ```
- Remove a chamada `listCloudOutlinesFn` desta aba → menos I/O no Supabase em toda abertura de dashboard (× milhares de usuários).
- Ordenar por `updated_at desc`. Sem limite de 3 — todas as notas da pasta entram no scroll.

### UI: 3 visíveis + **scroll vertical** por todas

- Container vertical com altura fixa equivalente a **~3 itens** (ex.: `max-h-[252px]` para `h-20` por item + gaps) e `overflow-y-auto` com `scrollbar-thin` — Tailwind puro, sem libs novas.
- Cada item ocupa **largura total** do cartão (títulos longos legíveis, consistente com o resto do dashboard).
- Vertical evita conflito com gestos horizontais do mobile (swipe de aba/voltar) e mantém o padrão visual dos demais cartões.
- Indicador sutil de "mais abaixo" (gradiente fade na borda inferior quando há overflow).
- Mostra: título + `updated_at` relativo. Sem badge local/cloud (todas locais).

### Abertura direta em "modo esboço"

- Trocar o `<Link to="/consideracoes-campo">` por:
  ```tsx
  <Link to="/consideracoes-campo" search={{ noteId: n.id, mode: "outline" }} />
  ```
- Em `_app.consideracoes-campo.tsx`:
  - Adicionar `validateSearch` para `{ noteId?: string; mode?: "edit" | "outline" }`.
  - Bootstrap: se `search.noteId` existe → `setActiveType("field_consideration")`, selecionar a nota, `setMode(search.mode ?? "outline")`.
  - Todos os recursos da página continuam disponíveis.

---

## Banco de dados / SQL / RLS

**Nenhuma migration necessária.**

- A pasta fixa é virtual no cliente → 0 linhas no Supabase × N usuários.
- Notas dentro dela usam o pipeline `personal_outlines` existente (sync, soft-delete, lixeira, RLS por `auth.uid() = user_id`).
- Dashboard passa a fazer **menos chamadas** ao Supabase (remove `listCloudOutlines` desta aba).

---

## Offline / PWA / APK

- 100% client-side (IndexedDB + i18n + roteamento TanStack). Idêntico em browser, PWA e APK.
- Pasta fixa aparece sem internet (constante hardcoded).
- Sem novas dependências e sem alterar `sw.js`.

---

## Resumo técnico

```text
bible-notes-store.ts
  + FIXED_FOLDER_WEEK_CONSIDERATIONS, isFixedFolder
  ~ listFolders → injeta a fixa em field_consideration
  ~ saveFolder / delete* / restore* → no-op para a fixa

_app.consideracoes-campo.tsx
  + validateSearch({ noteId?, mode? })
  + bootstrap: seleciona nota + força modo outline
  ~ árvore: badge "Fixa", esconde renomear/excluir na fixa

_app.dashboard.tsx
  ~ loadOutlines: listNotesByType('field_consideration', FIXED_FOLDER…)
  ~ remove listCloudOutlinesFn nesta aba
  ~ layout: lista vertical com max-h ≈ 3 itens, scroll-y, fade inferior
  ~ Link com search={ noteId, mode: 'outline' }

i18n/{pt,en,es}.json
  ~ dashboard.studyNotesTitle, dashboard.studyNotesOutlinesTab
  + personalOutlines.folders.weekConsiderations / .fixedBadge
```

## O que NÃO muda

- Subaba **Esboços** (outline) e o restante de `/consideracoes-campo`.
- Sync de esboços, lixeira, RLS, migrations, schema de `personal_outlines`.
- Aba **Recomendados** do cartão.
- Demais cartões e rotas.
