## Sistema de Backup, Restauração e Modelos Independentes

Funcionalidades **exclusivas para Superintendentes** em 3 frentes.

---

### 1. Modelos por Aba (Exportar / Importar)

Adicionar dois botões discretos no topo de cada uma destas páginas:

- **Checklist da Congregação** (`/_app/checklist-modelos`) → exporta/importa `checklist_templates` + `checklist_template_items`
- **Reuniões de Campo** (`/_app/modelo-reunioes-de-campo`) → exporta/importa `field_meeting_templates` + `field_meeting_template_items`
- **Programação/Cronograma** (`/_app/modelos`) → exporta/importa `program_templates` + `program_template_items`

**Exportar**: gera arquivo JSON com a estrutura/esqueleto (sem dados de congregações preenchidos), com cabeçalho `{ type: "checklist_template" | "field_meeting_template" | "program_template", version: 1, exportedAt, name, items: [...] }`.

**Importar**: lê o JSON, valida com Zod, e cria um novo template (com `superintendent_id = auth.uid()`, `congregation_id = null`) + todos os itens. Toast de sucesso e refresh da lista.

---

### 2. Web Share API nativa

Criar helper `src/lib/share.ts` com função `shareJsonFile(filename, json)`:

1. Cria `File` a partir do JSON
2. Se `navigator.canShare({ files: [file] })` → chama `navigator.share({ files, title, text })` (abre a folha nativa: email, WhatsApp, etc.)
3. Fallback: download direto via `<a download>` se Web Share API indisponível

Usado por todos os botões "Exportar Modelo" e pelo "Gerar Backup" geral.

---

### 3. Backup Global (na aba **Meu Perfil**)

Nova seção na página `/_app/perfil`:

- **Backup automático local**: hook `useAutoBackup` que escuta mudanças nas tabelas relevantes (via realtime ou polling leve) e salva snapshot no `localStorage` (`visita-sc:autobackup`) a cada alteração — com timestamp visível.
- **Botão "Gerar Arquivo de Backup"**: server function `exportFullBackup` que lê *todas* as tabelas do superintendente (congregations, visits, checklist_items, field_meetings, field_assignments, schedule_events, meals, transport_schedule, *_templates, *_template_items, user_roles dos anciãos vinculados) → retorna JSON consolidado → dispara Web Share API.
- **Botão "Restaurar Backup"**: upload de arquivo → valida estrutura com Zod → **AlertDialog de confirmação** com aviso claro ("isto irá sobrescrever os dados atuais") → server function `restoreFullBackup` que faz upsert em todas as tabelas dentro de uma transação.

---

### Detalhes técnicos

- **Server functions** em `src/lib/backup.functions.ts` e `src/lib/template-io.functions.ts` (apenas `createServerFn`, sem helpers misturados — evitar leak transitivo do `client.server`).
- Cada função usa `requireSupabaseAuth` e valida que o usuário tem role `superintendent` antes de qualquer escrita.
- Restauração filtra por `superintendent_id = userId` para nunca tocar dados de outros usuários.
- Versionamento de schema: campo `version: 1` em todo JSON; importação rejeita versões desconhecidas.
- UI: botões com ícones `Upload`/`Download`/`Share2` do lucide-react, variant `outline` size `sm`, no topo de cada página.

### Arquivos novos
- `src/lib/share.ts` (helper Web Share API)
- `src/lib/template-io.functions.ts` (exportar/importar 3 tipos de modelos)
- `src/lib/backup.functions.ts` (backup/restore global)
- `src/components/TemplateIOButtons.tsx` (par de botões reutilizável)
- `src/hooks/use-auto-backup.ts` (snapshot local)

### Arquivos modificados
- `src/routes/_app.checklist-modelos.tsx` — adiciona botões
- `src/routes/_app.modelo-reunioes-de-campo.tsx` — adiciona botões
- `src/routes/_app.modelos.tsx` — adiciona botões
- `src/routes/_app.perfil.tsx` — adiciona seção Backup Global
