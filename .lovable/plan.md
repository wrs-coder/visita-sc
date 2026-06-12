# Onda 7.11 — Missão 01 (Backup com cobertura total) ✅ entregue

Backup agora captura **tudo** o que o app guarda localmente, sem
depender de listas hardcoded de stores ou de chaves.

## O que mudou

### `src/lib/backup-client.ts` — dump genérico
- **IndexedDB**: itera `db.objectStoreNames` da base `visita-sc-field` e
  faz `getAll()` em cada store. Novos stores (ex.: futuras "Anotações"
  da subaba 02) entram no backup automaticamente, sem reescrever código.
- **localStorage**: scan total. Exclui apenas chaves específicas do
  dispositivo/sessão (`sb-*` do Supabase, `visita-sc:logout-intent`,
  `visita-sc:warmup-session`, `visita-sc:last-warmup`,
  `visita-sc:offline-ready`, `visita-sc-rq-cache`, prefixo
  `visita-sc:rq:`). Tudo o mais é incluído — bíblia ativa,
  marca-textos, configurações de leitura, rascunhos de reuniões
  (`meetings-draft:*`), perfil cacheado, preferências do dashboard,
  pasta de notas colapsadas, sessão de visitante, eventos ocultos.
- Espelha campos legacy (`notes/folders/libraries/bibles`) a partir do
  mapa genérico, mantendo retro-compat na leitura.

### `src/lib/backup-package.ts` — manifest v3
- Layout `client/indexeddb/<store>.json` para cada store; bíblia
  continua dividida por library (`client/indexeddb/bibles/<libId>.json`)
  com compressão nível 9.
- `unpackBackupZip` aceita v2 e v3 transparentemente.

### `src/routes/_app.perfil.tsx`
- Manifest gerado agora declara `version: 3`.

### Restauração genérica
- `restoreClientBackup` reabre o IDB, lê o mapa `indexedDB` (ou o
  reconstrói a partir dos campos legacy v2) e faz `put` em chunks de
  1000 em cada store conhecido. Stores desconhecidos do dump
  (versão futura) são ignorados em silêncio.
- LocalStorage é reescrito, exceto chaves de sessão (não sobrescreve
  o `sb-*-auth-token` do dispositivo que está restaurando).
- Retorno expandido: `{ notes, folders, libraries, verses, stores, lsKeys }`.

## Cobertura confirmada

| Dado | Onde mora | Coberto? |
|---|---|---|
| Esboços pessoais (rascunho local) | IDB `notes` | ✅ |
| Esboços pessoais (nuvem) | tabela `personal_outlines` | ✅ (já estava) |
| Notas/considerações de campo | IDB `notes` | ✅ |
| Pastas e subpastas | IDB `note_folders` | ✅ |
| Bíblia importada (versículos) | IDB `bibles` | ✅ |
| Metadados da biblioteca | IDB `bible_libraries` | ✅ |
| Biblioteca ativa | LS `visita-sc-bible-active` | ✅ |
| Marca-textos | LS `bible:highlights:v1` | ✅ |
| Configurações de leitura | LS `bible:view-settings` | ✅ |
| Rascunhos de reuniões | LS `meetings-draft:*` | ✅ |
| Considerações privadas — congregação fixada | LS `notas_privadas_congregation_id` | ✅ |
| Fila offline | LS `visita-sc:offline-queue` | ✅ |
| Eventos do circuito ocultos | LS `visita-sc:hidden-circuit-events` | ✅ |
| Tema/idioma | LS `visita-sc:theme:v1`, i18n | ✅ |

## Verificação
- `bunx tsc --noEmit` 100% limpo.

## Próximas missões
- 02 — Subaba "Anotações" em Esboços Pessoais.
- 03 — Popup bíblico persistente em Tela Cheia.
- 04 — Olho expandido no cartão "Pastoreiem".
