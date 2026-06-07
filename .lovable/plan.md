
## Objetivo

Tornar o backup gerado em **Perfil → Backup** verdadeiramente completo: ao restaurar em outro dispositivo (ou após reinstalar), o app deve voltar com **todos os dados do usuário** intactos — incluindo Bíblia importada, notas bíblicas, esboços, programações, modelos e configurações — sem mexer no mecanismo de atualização do APK/PWA.

## O que falta hoje

Hoje `exportFullBackup` (`src/lib/backup.functions.ts`) só salva: congregações, visitas, checklist, reuniões/atribuições de campo, cronograma, refeições, transporte, notas privadas e 3 famílias de modelos (checklist / reunião de campo / programação genérica).

Não inclui:

- **Bíblia importada** (IndexedDB do navegador) e suas pastas/notas (`bible-notes-store`).
- **Configurações de leitura** da Bíblia, marca-textos, biblioteca ativa (`localStorage`: `bible-view-settings`, highlights, active library).
- **Esboços pessoais** (`personal_outlines`).
- **Mensagens do casal** (`couple_messages`).
- **Modelos de discursos** (`meeting_talk_templates` + 4 sub-tabelas).
- **Modelos de programação dos anciãos** (`elder_program_templates` + sections/slots/events) e dados por visita (`elder_program_visit_sections/slots`, `elder_visit_*`).
- **Eventos de circuito** (`circuit_schedule_events`), **eventos ocultos** (`hidden_events`), **extras de modelo aplicados na visita** (`visit_template_extras`), **pendências** (`visit_pending_updates`).
- **Senha da aba dos anciãos** e metadados associados na congregação.

## O que será feito

### 1. `backup.functions.ts` — expandir export/restore (servidor)

Adicionar ao snapshot, com os mesmos filtros de segurança já existentes (escopo por `superintendent_id` / `congregation_id` / `visit_id`):

- `personal_outlines`, `couple_messages`
- `circuit_schedule_events`, `hidden_events`
- `visit_template_extras`, `visit_pending_updates`
- `meeting_talk_templates` + `meeting_talk_template_elders/_midweek/_pioneer/_weekend_themes`
- `elder_program_templates` + `_sections/_slots/_events`
- `elder_program_visit_sections`, `elder_program_visit_slots`, e tabelas `elder_visit_*` (encouragements, local matters, pastoral visits, recommendations, visit sections, visit slots)
- Campos extras das congregações (senha da aba de anciãos via `set_elder_tab_password` no restore, nunca o hash diretamente)
- `meal_day_notes`, `daily_notes` (se ainda não no payload)

No restore, aplicar o mesmo padrão: filtrar por congregações/visitas/templates já pertencentes ao usuário, forçar `superintendent_id = userId`, descartar linhas órfãs.

### 2. Novo `client-backup.ts` (cliente) — dados locais

Coletar e restaurar o que vive no navegador:

- **IndexedDB**: bíblias importadas, notas bíblicas, pastas (já há helpers em `bible-notes-store.ts`; expor `dumpAll()` / `restoreAll()`).
- **localStorage**: `bible-view-settings`, highlights, biblioteca ativa, configurações offline relevantes (lista enxuta — não copiar caches do React Query nem do SW).

### 3. Empacotamento — arquivo único `.zip`

Bíblia importada pode ter dezenas de MB, então um único JSON inviabiliza o download em celulares.

- Usar **JSZip** para gerar `visita-sc-backup-AAAA-MM-DD.zip` contendo:
  - `manifest.json` (tipo, versão 2, data, userId)
  - `server.json` (payload do `exportFullBackup`)
  - `client/local.json` (localStorage filtrado)
  - `client/bibles/<id>.json` (uma bíblia por arquivo)
  - `client/notes.json`, `client/folders.json`
- Restauração: ler `manifest.version` — `v2` aciona fluxo novo (server + client), `v1` mantém compatibilidade chamando só o restore servidor atual.

### 4. UI em `_app.perfil.tsx`

- Botão **Gerar backup** chama servidor + coleta cliente + monta `.zip`.
- Botão **Restaurar backup** aceita `.zip` (v2) **ou** `.json` (v1 legado).
- Indicador de progresso por etapa (servidor, bíblias, notas, configs) com `toast` final.
- Texto explicativo: "Inclui tudo (Bíblia, notas, esboços, modelos, programações). O arquivo é seu — guarde-o em local seguro."

### 5. Atualizações do APK/PWA — sem regressão

O backup é **um arquivo baixado pelo usuário**, não cache do app:

- Não toca em `public/sw.js`, no `vite-plugin-pwa`, no `query-persister` nem no fluxo de Modo Offline.
- O Service Worker continua `autoUpdate` + `NetworkFirst` para HTML (atualização normal do PWA).
- O APK Capacitor continua atualizando pelo fluxo atual (novo build → novo APK).
- Restaurar um backup **não** restaura SW/manifest/assets — só os dados — então não há risco de "travar" o app em uma versão antiga.

### Detalhes técnicos (resumo p/ revisão técnica)

```text
src/
├── lib/
│   ├── backup.functions.ts        (expandir export/restore servidor, v2)
│   ├── backup-client.ts           (NOVO: dump/restore IDB+localStorage)
│   └── backup-package.ts          (NOVO: empacotar/desempacotar .zip via JSZip)
└── routes/_app.perfil.tsx         (UI: progresso, aceitar .zip|.json)
```

- Dependência nova: `bun add jszip` (≈100 kB gz, suportada em Worker e browser).
- Bíblia: serializada como JSON por livro/capítulo conforme já existe no IDB; sem binário.
- Segurança: restore servidor mantém todas as travas atuais (IDs órfãos descartados, `superintendent_id` reescrito).
- i18n: novas chaves `profile.backup.*` (etapas + descrição) em pt/es/en.

## Fora de escopo

- Backup automático em nuvem (continua o snapshot local existente em `useAutoBackup`).
- Migração do conteúdo da Bíblia para o servidor — segue 100% client-side, dentro do `.zip`.
