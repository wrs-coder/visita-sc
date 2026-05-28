# Esboços Pessoais — Reestruturação completa

Aditivo: nada do que já existe (notas atuais, exportações PDF, fila offline, sync, RLS, gate de superintendente) é alterado. Tudo abaixo é só IndexedDB/localStorage local + UI.

## 1. Sidebar e nomenclatura (`src/routes/_app.tsx`, `src/i18n/locales/*.json`)

- Mover `/resumo-semana` e `/consideracoes-campo` da seção **Visita** para **Principal**, posicionados **logo acima** de `/notas` (ordem: Home, Cronograma, Itinerário, Congregações, Resumo da semana, Esboços Pessoais, Notas Privadas).
- Renomear chave i18n `sidebar.fieldConsiderations` e `fieldConsiderations.title/subtitle` para "Esboços Pessoais" (pt/en/es). URL `/consideracoes-campo` permanece para não quebrar links/rotas.
- Ícone: trocar `BookOpen` por `FileText` (BookOpen continua representando a Bíblia ativa).

## 2. Modelo de dados local (`src/lib/bible-notes-store.ts`)

Bump `DB_VERSION` 2 → 3, adicionar `STORE_FOLDERS` com `keyPath: "id"` + índice `by_parent` em `parentId` e `by_type` em `type`. Migração `onupgradeneeded` cria a store sem tocar nas existentes.

```ts
export type NoteType = "field_consideration" | "outline";

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;   // null = raiz
  type: NoteType;
  created_at: number;
}

// FieldNote ganha campos opcionais (retrocompatíveis):
export interface FieldNote {
  id: string;
  type?: NoteType;           // default "field_consideration" para notas antigas
  folderId?: string | null;  // null = raiz; ausente em notas legadas
  title: string;
  // Field consideration:
  prayer?: string;
  territory?: string;
  assistants?: string;
  // Outline:
  description?: string;
  content: string;
  created_at: number;
  updated_at: number;
}
```

Novas funções (todas com fallback localStorage espelhando o padrão atual):
- `listFolders(type?: NoteType): Promise<NoteFolder[]>`
- `saveFolder(f: NoteFolder)`, `newFolderId()`
- `deleteFolderCascade(id: string)` — apaga subpastas (recursivo via `by_parent`) e todas as notas com `folderId` nessas pastas.
- `listNotesByType(type: NoteType, folderId?: string | null)` — filtra por tipo e (opcional) pasta.
- `exportFolderJSON(id)` → `{ version: 1, kind: "folder", folder, subfolders[], notes[] }`.
- `exportNoteJSON(id)` → `{ version: 1, kind: "note", note }`.
- `importJSON(payload, targetParentId?)` — recria estrutura com **novos IDs** (evita colisão) preservando hierarquia; respeita o `type` no payload.

Notas legadas (sem `type`/`folderId`) são tratadas como `field_consideration` na raiz; mostradas apenas após o usuário escolher esse tipo. Nada é apagado.

## 3. Tela `/consideracoes-campo` (`src/routes/_app.consideracoes-campo.tsx`)

Reescrita preservando o gate de superintendente e o `BibleManagerDialog`.

**Layout**

```text
[Header: Esboços Pessoais]
[Strip da Bíblia ativa] (inalterado)
[Seletor de tipo (segmented): "Consideração de Campo" | "Esboço"]    ← obrigatório

  ┌─ Sidebar (árvore) ─────────────┐  ┌─ Editor ───────────────────────┐
  │ [+ Nova pasta] [Importar JSON] │  │ Vazio até abrir/criar nota     │
  │ ▸ 📁 Pasta A          ⋮        │  │                                │
  │   ▾ 📁 Sub A.1        ⋮        │  │                                │
  │     • Nota X                   │  │                                │
  │   • Nota Y                     │  └────────────────────────────────┘
  │ ▸ 📁 Pasta B          ⋮        │
  └────────────────────────────────┘
```

- Enquanto `activeType === null`, painéis ficam ocultos com mensagem "Escolha um tipo para começar".
- Árvore retrátil com toggle por pasta (chevron). Estado de expansão em `useState` (não persistido).
- Menu `⋮` por pasta: **Nova subpasta**, **Renomear**, **Exportar Pasta (JSON)**, **Excluir** (confirm com aviso de cascata).
- Botão **+ Nova nota** dentro da pasta selecionada salva com `folderId` corrente; se nenhuma pasta selecionada, salva na raiz do tipo ativo.
- Formulário renderiza condicionalmente:
  - `field_consideration`: Título, Oração Final, Território, Dirigentes, Conteúdo.
  - `outline`: Título, Descrição, Conteúdo.
- Cabeçalho da nota aberta inclui botão **Exportar Nota (JSON)** + botão **Tela cheia** (ver §5).
- `Importar JSON`: input `<input type="file" accept="application/json">`; detecta `kind` e chama `importJSON`. Toast com nº de pastas/notas criadas.

Export/import seguem o padrão visual do `TemplateIOButtons` (botões `outline` discretos) mas com lógica própria (formato distinto dos modelos).

## 4. Popover bíblico (`src/components/bible/BibleVersePopover.tsx`)

- `PopoverContent`: trocar para `className="w-80 max-w-[90vw] max-h-[60vh] overflow-y-auto"`.
- Wrapper interno do texto recebe `max-h` + `overflow-y-auto` para garantir rolagem mesmo em popovers nested.
- Aceitar prop opcional `fontScale?: number` (default 1) que multiplica `font-size` do bloco de texto — usado pelo Modo Esboço.

## 5. Modo Esboço em tela cheia

Novo componente local `OutlineFullscreen` renderizado via portal (`fixed inset-0 z-50 bg-background`) quando o usuário clica **Tela cheia** numa nota salva.

- Topo: barra fina com Título, controles `A−` / `A+` (font scale 0.85 → 1.6, passo 0.1, persistido em `localStorage` "esboco:fontScale"), botão `X` para sair.
- Corpo: área única rolável (`overflow-y-auto`) com o conteúdo + `VerseLink`s. O popover bíblico mantém sua própria rolagem (§4) — rolagens independentes.
- `fontScale` é passado ao `OutlineContent` (aplica `style={{ fontSize }}`) **e** ao `VerseLink`/`BibleVersePopover` via prop.
- Esconde sidebar do app porque o overlay cobre toda a viewport (z-50 acima do `SidebarProvider`). Sem mudanças no layout global.

## 6. i18n

Adicionar em `pt.json` (e espelhar em en/es) chaves:
`sidebar.personalOutlines`, `personalOutlines.title/subtitle`, `personalOutlines.typePicker.{field,outline,prompt}`, `personalOutlines.folders.{new,newSub,rename,delete,deleteWarn,exportFolder,exportNote,import,empty,root}`, `personalOutlines.fields.{description,descriptionPh}`, `personalOutlines.fullscreen.{enter,exit,fontUp,fontDown}`.

Manter chaves `fieldConsiderations.*` antigas como fallback (já usadas dentro do formulário field_consideration).

## 7. Compatibilidade (APK/PWA/web)

- `indexedDB` + `localStorage` já são usados pelo arquivo; nenhum API nova é introduzida.
- Export usa `Blob` + `URL.createObjectURL` + `<a download>` (mesmo padrão do `TemplateIOButtons`), funcionando em Capacitor WebView, PWA e browser.
- Import usa `<input type="file">` — suportado em Capacitor.
- Nenhuma alteração em rotas de servidor, fila offline, sync ou políticas RLS.

## Arquivos tocados

- `src/lib/bible-notes-store.ts` — aditivo (nova store + funções).
- `src/routes/_app.consideracoes-campo.tsx` — reescrita da UI.
- `src/components/bible/BibleVersePopover.tsx` — rolagem + `fontScale`.
- `src/routes/_app.tsx` — reordenação sidebar + nova label.
- `src/i18n/locales/{pt,en,es}.json` — novas chaves.

## Validação

- `bun run test` — suíte existente (`bible-refs.test.ts`) continua verde.
- Smoke manual: criar pasta/subpasta, criar notas dos dois tipos, exportar+importar pasta, abrir tela cheia, ajustar fonte, abrir popover longo (ex.: Salmo 119) e rolar.
