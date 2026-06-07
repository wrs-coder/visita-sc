# Missão 1 — Mover o guard de exclusão do Dashboard para o Itinerário

**Diagnóstico:** o `VisitDeletionGuardDialog` foi colocado em dois lugares no Dashboard (`src/routes/_app.dashboard.tsx`):
- Linha 770: botão "Finalizar agora" para visitas vencidas
- Linha 800: botão "Finalizar visita" da visita ativa

Isso deixou o fluxo do Dashboard mais lento e com fricção que o usuário não quer. O botão de exclusão de visita do Itinerário fica em `src/routes/_app.configuracoes.tsx` (linhas 712–736 dentro do diálogo de edição, e 845–868 no card de cada visita), e hoje dispara `removeById(v.id)` direto, sem o guard.

### Mudanças

1. **`src/routes/_app.dashboard.tsx`** — restaurar o comportamento original:
   - Substituir `VisitDeletionGuardDialog` pelo `FinishVisitDialog` nos dois pontos (linhas 770 e 800), mantendo as mesmas props (`visitId`, `visitTitle`, `hideTrigger`, `open`, `onOpenChange`, `onFinished`). O `FinishVisitDialog` já é o popup original com check do S‑303 + recomendações que finaliza/exclui a visita.
   - Remover o import de `VisitDeletionGuardDialog`.

2. **`src/routes/_app.configuracoes.tsx`** — aplicar o guard nos dois botões de "Excluir visita":
   - Card da visita (linhas 845–868): trocar o `AlertDialog` simples por um `VisitDeletionGuardDialog` controlado (state local `guardForId`), com `hideTrigger`, abrindo ao clicar no ícone de lixeira; `onFinished` chama `removeById(v.id)` é desnecessário porque o guard já apaga via `FinishVisitDialog` — então o callback apenas faz refresh da lista (`refetch`/`invalidate`) que o `removeById` faria.
   - Diálogo de edição (linhas 712–736): mesma troca; ao concluir, fechar o dialog (`setOpen(false)`).
   - Importar `VisitDeletionGuardDialog`.

3. **Não alterar** `VisitDeletionGuardDialog.tsx` nem `FinishVisitDialog.tsx`.

# Missão 2 — Análise dos 6 alertas de segurança

Recomendação geral: **corrigir todos**, em 2 ondas. Nenhuma dessas correções, feita com o cuidado descrito, quebra funcionalidade — todas mantêm a mesma API pública das server functions, só adicionam verificação de dono. Resumo por alerta:

### Ondas seguras (baixo risco de quebra — fazer já)

1. **IDOR `getBackupSignedUrl`** (`template-propagation.functions.ts`) — Risco alto, fix trivial: extrair `congregationId` do primeiro segmento do `path` e validar `superintendent_id === userId`. Não muda contrato.

2. **IDOR pending updates** (4 funções em `template-propagation.functions.ts`: `countPendingUpdatesForCongregation`, `listPendingUpdatesForCongregation`, `dismissPendingUpdate`, `dismissAllPendingUpdatesForVisit`) — adicionar checagem de dono via `congregations.superintendent_id`/join com `visits`. Mesma assinatura, mesma resposta para o dono legítimo.

3. **`listElderProgramForVisit`** — substituir o short‑circuit `isSuper` por `isSuperOfThisCong` (compara `superintendent_id` da congregação da visita). Anciãos e o SC dono continuam vendo tudo; só fecha o vazamento cross‑congregação.

4. **`SUPER_CODE` hardcoded** — mover para `process.env.SUPER_REGISTRATION_CODE` (secret). Precisa **antes**: cadastrar o secret com o valor atual `152832` para não quebrar cadastros novos. Depois disso a rotação é só trocar o secret.

### Ondas que precisam de coordenação (médio risco — fazer logo em seguida)

5. **`elder_tab_password_plain` em cleartext** — a coluna é lida hoje em `auth.functions.ts > listMyElders` para revelar a senha ao Superintendente no card do ancião (feature da Missão 1 anterior). Plano seguro:
   - Manter a coluna por enquanto, mas restringir o SELECT via **view** ou trocar a policy `members see congregation` para uma view que **omite** o campo `elder_tab_password_plain`, e ler o plaintext só via server function `getElderTabPasswordForElder` (que já existe e é server‑side).
   - Remover o campo do client `select('*')` em qualquer query. Validar que nenhum componente lê `congregation.elder_tab_password_plain` diretamente.
   - Depois disso, a coluna continua existindo mas não é mais exposta pela Data API.

6. **Realtime sem RLS em `realtime.messages`** — risco baixo na prática (os canais usados são `visits-<congId>-<uniq>` etc., e `postgres_changes` aplica RLS da tabela alvo). Mesmo assim, adicionar policy em `realtime.messages` exigindo que o `topic` contenha um `congregation_id` ao qual o usuário pertença, OU restringir a `service_role`. Esse fix é cirúrgico em SQL e não quebra os hooks atuais se mantivermos os nomes de canal já em uso.

### O que **não** fazer
- Não alterar contrato de retorno das server functions afetadas — só adicionar a verificação de dono + retornar erro `'Não autorizado.'` quando falhar.
- Não remover `elder_tab_password_plain` ainda; primeiro tirar da view exposta, validar fluxo do SC, e só depois (próxima missão) migrar para tabela separada `elder_tab_password_secrets` com RLS exclusiva do superintendente, conforme o alerta sugere.

### Ordem de execução proposta
1. Missão 1 (guard no Itinerário, restaurar Dashboard).
2. Onda segura: alertas 1–4 (uma migration de secret + edição de 2 arquivos `.functions.ts`).
3. Onda coordenada: alerta 5 (mudança da policy/view + ajustes de leitura) e alerta 6 (policy realtime).

Confirma esta ordem para eu começar pela Missão 1?
