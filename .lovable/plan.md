## Visão Geral

Implementar **Lixeira (Ponto 02)** e **Esboços Pessoais cloud-first com cache local (Ponto 03)** seguindo as diretrizes do `instructions.md` (RLS rigoroso para Superintendente, persistência local como rascunho, padrões offline-first existentes do app).

A solução prioriza: economia no Supabase (soft-delete leve + retenção curta + purga via `pg_cron`), velocidade local (IndexedDB como cache + leituras instantâneas), portabilidade (esboços viajam com o login do usuário), e zero risco de perda de dados existentes (migração one-shot dos esboços locais antes de cortar dependência).

---

## Ponto 02 — Lixeira (Soft-Delete com retenção de 30 dias)

### Escopo da v1
- ✅ `private_notes` (todas as subabas, incluindo "Recomendados", "Anciãos", etc.)
- ✅ `personal_outlines` (esboços pessoais)
- ✅ `note_folders` locais (com cascata — restaurar pasta restaura filhos não purgados)
- ❌ `couple_messages` fica de fora (conversas com soft-delete confundem o destinatário)
- ❌ Itinerário, modelos, checklist, etc. ficam de fora (são compartilhados, alto risco de UX)

### Modelo de dados (Supabase)
Adicionar coluna `deleted_at timestamptz NULL` em:
- `public.private_notes`
- `public.personal_outlines`

Índice parcial para purga eficiente: `WHERE deleted_at IS NOT NULL`.

### RLS e leitura
- **Todas as policies de SELECT atuais** continuam — mas o app filtra `deleted_at IS NULL` em leituras normais.
- Para a aba Lixeira, query separada `WHERE deleted_at IS NOT NULL`.
- Nenhuma policy nova exigida (Superintendente já gerencia tudo do seu escopo, conforme instruções 3 e RLS existente).

### Purga automática (economia de banco)
`pg_cron` diário às 03:00 UTC: `DELETE` físico dos registros com `deleted_at < now() - interval '30 days'`. Roda 100% em SQL, sem `pg_net`, sem custo de endpoint.

### Lixeira local (IndexedDB)
- `FieldNote` ganha campo opcional `deleted_at?: number`.
- `NoteFolder` ganha `deleted_at?: number`.
- Funções existentes `listNotes`/`listFolders` filtram por padrão; nova `listTrashed()`.
- Purga local: ao abrir a tela Lixeira, descarta registros com `deleted_at < now - 30d`.
- `deleteNote`/`deleteFolderCascade` passam a fazer soft-delete por padrão; nova função `purgeNote(id)` para deleção definitiva manual.

### UX
- Nova rota `/configuracoes/lixeira` com 3 seções (Esboços pessoais, Notas privadas, Pastas locais).
- Cada item mostra título + dias restantes ("expira em 23 dias") + botões **Restaurar** e **Apagar agora**.
- Botão "Esvaziar Lixeira" por seção (com `confirm`).
- Link de atalho a partir de Configurações.
- Toast nas exclusões já passa a ter ação **"Desfazer"** (30 s) que chama Restaurar imediato.

### Compatibilidade
- Botões de "Excluir" existentes em `consideracoes-campo`, `notas`, etc. continuam funcionando — apenas migram para soft-delete por baixo. UX visível não muda além do toast de Desfazer.

---

## Ponto 03 — Esboços Pessoais cloud-first com cache local

### Princípios
- **Fonte da verdade**: tabela `public.personal_outlines` na nuvem.
- **Cache local**: IndexedDB (store `notes` existente, type `outline`) — leitura é instantânea offline.
- **Sync transparente**: ao criar/editar online → grava local + envia para nuvem. Offline → grava local + enfileira na `offline-queue` existente.
- **Login em outro dispositivo / reinstalação**: ao logar, baixa todos os esboços do usuário do Supabase para o IndexedDB.

### Remoção do limite de 10
- Drop da function/trigger `enforce_personal_outlines_limit` (sem substituto).
- Custo desprezível: cada esboço é JSON pequeno (`< 50 KB` típico). Mesmo 1000 esboços/usuário × milhares de usuários ficam abaixo de 1 GB no `personal_outlines`.
- Para evitar abuso extremo, manter limite de **tamanho por linha** via validação Zod no server-fn (`content` já capado em 100 KB) e limite soft no app de **500 esboços por usuário** (warning amigável, não erro).

### Estratégia de sync (Last-Write-Wins por `updated_at`)
1. **Read** (montar lista): UI lê IndexedDB primeiro (resposta instantânea). Em paralelo, dispara `listCloudOutlines` e faz merge:
   - Se cloud tem item mais novo → sobrescreve local.
   - Se local tem item mais novo → enfileira `pushOutlineToCloud`.
   - Itens só na nuvem → baixa para local.
   - Itens só locais SEM `cloud_id` → push (nova criação).
   - Itens só locais COM `cloud_id` (já existiu na nuvem) → tratar como deleção remota → soft-delete local (move para Lixeira).
2. **Write**: sempre grava local primeiro (otimista) → tenta cloud → se offline, enfileira.
3. **Delete**: soft-delete em ambos (alimenta Ponto 02).

### Schema local
Adicionar ao `FieldNote` (somente quando `type === "outline"`):
- `cloud_id?: string` (UUID do Supabase, para o LWW)
- `dirty?: boolean` (precisa subir)
- `synced_at?: number`

### Migração one-shot (sem perda de dados)
No primeiro login pós-deploy, hook `useOutlinesSync` detecta esboços locais sem `cloud_id` e os sobe automaticamente (respeitando rate, com indicador discreto). Marca `migration:outlines:v1` no `localStorage` para não repetir.

### Server functions (ajustes em `src/lib/personal-outlines.functions.ts`)
- `pushOutlineToCloud`: remove o bloqueio `>= 10`.
- `listCloudOutlines`: já retorna tudo; manter, remover campo `remaining` ou deixar como `Infinity`.
- Nova `bulkPushOutlines` para o sync inicial em lote (até 50 por chamada).
- Nova `softDeleteCloudOutline` (UPDATE `deleted_at = now()`) e `restoreCloudOutline` para a Lixeira.
- `deleteCloudOutline` existente vira purga definitiva (usada pela Lixeira "Apagar agora" e pelo cron).

### Performance offline
- Tudo continua funcionando offline (IndexedDB é fonte primária de leitura).
- Sync ocorre em background quando volta online via listener `online` já presente em `offline-queue`.

---

## Ordem de execução (build mode)

1. **Migração SQL** — adiciona `deleted_at`, índices parciais, remove trigger de limite, agenda `pg_cron` de purga.
2. **`src/lib/personal-outlines.functions.ts`** — ajustes (sem limite, novas fns soft-delete/restore/bulk).
3. **`src/lib/bible-notes-store.ts`** — soft-delete local, novos campos `cloud_id`/`dirty`/`synced_at`, helpers `listTrashed`/`purgeNote`/`restoreNote`.
4. **`src/hooks/use-outlines-sync.ts`** (novo) — orquestra merge cloud↔local + migração one-shot.
5. **Adaptações de UI** em `_app.consideracoes-campo.tsx` e `_app.notas.tsx` — toast "Desfazer", uso do soft-delete por baixo. Sem mudança visual relevante.
6. **Nova rota `_app.configuracoes.lixeira.tsx`** — UI da Lixeira.
7. **i18n** — chaves novas (PT/EN/ES).

---

## Detalhes técnicos

### SQL (migration)
```sql
ALTER TABLE public.private_notes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_private_notes_deleted_at
  ON public.private_notes(deleted_at) WHERE deleted_at IS NOT NULL;

ALTER TABLE public.personal_outlines
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_personal_outlines_deleted_at
  ON public.personal_outlines(deleted_at) WHERE deleted_at IS NOT NULL;

-- Remove limite artificial de 10 esboços
DROP TRIGGER IF EXISTS enforce_personal_outlines_limit_trigger
  ON public.personal_outlines;
DROP FUNCTION IF EXISTS public.enforce_personal_outlines_limit();

-- Purga diária
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'purge-soft-deleted-30d',
  '0 3 * * *',
  $$
    DELETE FROM public.private_notes
      WHERE deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days';
    DELETE FROM public.personal_outlines
      WHERE deleted_at IS NOT NULL
        AND deleted_at < now() - interval '30 days';
  $$
);
```

### Tipos
```ts
// FieldNote ganha:
deleted_at?: number;
cloud_id?: string;
dirty?: boolean;
synced_at?: number;
```

### Sem efeitos colaterais
- Couple messages, mensagens, itinerário, checklist, modelos: **não tocados**.
- RLS atual: **não alterada** (continua válida; soft-delete é só app-level filter).
- Trigger `handle_new_user`: intocado.

---

## Riscos & mitigação

| Risco | Mitigação |
|---|---|
| Conflito de edição simultânea | LWW por `updated_at` — perda mínima, registrada em log local; usuário pode restaurar versão antiga da Lixeira em até 30 d |
| Quota IndexedDB estourada por usuários com 1000+ esboços | Soft-warn no app aos 500; cap de tamanho por esboço (100 KB) |
| `pg_cron` indisponível em algum plano | Fallback: server route `/api/public/cron/purge-trash` chamada por scheduler externo; mesma query SQL |
| Migração one-shot falhar | Idempotente: itens locais sem `cloud_id` ficam marcados `dirty` e tentam de novo no próximo online |
| Usuário "apagar para sempre" por engano | Confirmação obrigatória; toast Desfazer só na exclusão normal (vai para Lixeira) |

---

## Métricas de economia (estimativa)
- 10 000 usuários × 50 esboços médios × 30 KB = **~15 GB** total no `personal_outlines` (insignificante no Supabase).
- Soft-delete com retenção de 30 d adiciona ~5 % de overhead máximo.
- Purga via `pg_cron` é SQL puro → custo zero de função/endpoint.