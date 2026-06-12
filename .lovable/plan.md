# Onda 7.11 — Missão 02 (Subaba "Anotações") ✅ entregue

Nova subaba 100 % local em **Esboços Pessoais**, ao lado de
"Consideração de Campo" e "Esboço".

## O que mudou

### Tipo novo de nota
- `src/lib/bible-notes-store.ts`: união `NoteType` agora inclui
  `"talk_notes"`. As anotações entram no mesmo `STORE_NOTES`
  (IndexedDB) — backup genérico da M1 cobre automaticamente, sem
  novo store nem nova chave.

### `src/routes/_app.consideracoes-campo.tsx`
- **Terceira aba** no seletor, com ícone `NotebookPen` e rótulo
  `personalOutlines.typePicker.talkNotes`.
- **Sem nuvem**: a subaba é puramente local.
  - `syncOutlinesIfOnline` retorna `null` quando `activeType ===
    "talk_notes"`.
  - `handleCloudPush` / `handlePushNoteById` viram no-op para notas
    `talk_notes` (defesa em profundidade).
  - Botões removidos visualmente: `CloudDownload` na barra lateral,
    `CloudUpload` no menu de cada nota, `CloudUpload` na barra de
    seleção múltipla e botão "Nuvem" no rodapé do editor.
- **Sem Tela Cheia / Modo Esboço**: o editor abre direto em modo
  `edit`.
  - `selectNote` força `setMode("edit")` para anotações.
  - `useEffect` em `activeType` força `setMode("edit")` ao entrar na
    subaba.
  - `handleSave` mantém o modo `edit` no salvar (não cai para
    "outline").
  - Toggle "Editar / Esboço" e botão "Tela Cheia" não renderizam
    quando `type === "talk_notes"`.
- **Mantido**: detecção de citações bíblicas + `VerseLink` /
  `BibleVersePopover`, exatamente o mesmo do modo `edit` das outras
  subabas. Visão simultânea editor + popover continua igual.

### i18n
- `personalOutlines.typePicker.talkNotes` adicionado em pt/en/es:
  - pt: "Anotações"
  - en: "Notes"
  - es: "Apuntes"

## Cobertura automática
- Backup `.zip` v3 (M1) varre `db.objectStoreNames`, então as
  anotações já entram em `client/indexeddb/notes.json` sem nenhuma
  mudança em `backup-client.ts`.
- Não há rota nova, não há tabela nova, não há policy nova.

## Verificação
- `bunx tsc --noEmit` 100% limpo.

## Próximas missões
- 03 — Popup bíblico persistente em Tela Cheia.
- 04 — Olho expandido no cartão "Pastoreiem".
