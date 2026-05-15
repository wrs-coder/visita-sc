## Modelos de Checklist por congregação

Hoje a checklist é semeada por trigger fixo (`seed_default_checklist`) sempre igual. Vou trocar isso por **modelos de checklist** que o superintendente cria, edita, duplica e vincula a uma congregação — análogo aos modelos de programação.

### Banco de dados (migration)

- Nova tabela `checklist_templates`
  - `id`, `superintendent_id`, `name`, `congregation_id` (nullable), timestamps
  - Índice único parcial: `(superintendent_id, congregation_id)` quando `congregation_id IS NOT NULL` → garante 1 modelo por congregação
  - Trigger `enforce_checklist_template_limit`: máx. 24 ativos por superintendente
- Nova tabela `checklist_template_items`
  - `id`, `template_id`, `title`, `description`, `sort_order`
- RLS: superintendente dono gerencia tudo; anciãos da congregação podem **ler** o modelo vinculado (opcional, mantém só o super lendo).
- Substituir trigger `seed_default_checklist`:
  - Ao criar `visits`, se a congregação tem `checklist_templates.congregation_id = v.congregation_id`, copiar os itens daquele modelo para `checklist_items`.
  - Senão, manter os 13 itens padrão atuais como fallback.
- Em **nova visita** para a mesma congregação, a checklist continua zerada (já é por visita).

### Server functions (`src/lib/checklist-templates.functions.ts`)

- `listChecklistTemplates` — todos os modelos do super + contagem
- `createChecklistTemplate({ name, congregationId? })` — valida limite 24 e unicidade por congregação
- `renameChecklistTemplate({ id, name })`
- `linkChecklistTemplate({ id, congregationId | null })` — valida que a congregação ainda não tem modelo
- `duplicateChecklistTemplate({ id, name })` — copia itens, deixa `congregation_id = null`
- `deleteChecklistTemplate({ id })`
- `replaceChecklistTemplateItems({ templateId, items: [{title, description?, sort_order}] })`

### UI

- Nova rota `/checklist-modelos` (superintendente):
  - Lista de modelos com nome, congregação vinculada, nº de itens
  - Botões: criar, renomear, duplicar, vincular a congregação (select), excluir
  - Editor de itens (título + descrição opcional), arrastar/ordenar simples por botões ↑/↓
  - Indicador "X / 24 modelos"
- Adicionar link no menu lateral para superintendentes em `_app.tsx`
- Na página `/modelos` ou `/congregacoes`, manter o vínculo de modelo de programação como está; o vínculo da checklist é gerido na nova rota.
- Página `/checklist` (anciãos) permanece igual — ela apenas exibe os itens já semeados na visita ativa, agora vindos do modelo.

### Validações chave

- Não permite vincular a mesma congregação a 2 modelos.
- Não permite criar acima de 24.
- Ao duplicar, o duplicado nasce **sem** congregação vinculada (o super decide depois).
- Ao deletar um modelo vinculado, a próxima visita criada cai no fallback padrão.

Confirma que posso seguir?