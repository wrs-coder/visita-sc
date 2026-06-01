## Objetivo

Hoje a aba **Esboços pessoais** (rota `/_app/consideracoes-campo`, com as subabas *Esboços* e *Considerações de campo*) já guarda tudo localmente, mas dispara sincronização com a nuvem em quase toda ação (criar, editar, mover, reordenar, excluir, abrir o app). Isso faz com que:

- a ordem manual das notas seja sobrescrita pela ordem vinda da nuvem;
- exclusões e reorganizações no celular pareçam "voltar"; e
- o smartphone fique amarrado à conexão para qualquer ajuste local.

A proposta é deixar a área **100% local por padrão** e só conversar com a nuvem quando você clicar em **Salvar** (em uma nota específica) ou nos botões de **Enviar para a nuvem / Importar da nuvem / Sincronizar agora**.

A aba **"Notas Privadas"** (`_app/notas.tsx`), o resto do app (reuniões, escala, checklist, perfil, etc.) e o backup geral **não são afetados** — só mexemos no hook de sincronização dos esboços e em onde ele é chamado.

## Mudanças

### 1. Desligar a sincronização automática dos esboços
- Em `src/routes/_app.tsx`, parar de chamar `useOutlinesSync()` no carregamento do app. O hook continua existindo, mas só roda quando alguém pedir explicitamente.
- Em `src/hooks/use-outlines-sync.ts`, remover os gatilhos automáticos internos (`online`, `visibilitychange`, `resume`, `onAuthStateChange`) — o hook passa a expor apenas a função `syncNow()` chamada sob demanda.

### 2. Remover o auto-sync após cada ação local
Em `src/routes/_app.consideracoes-campo.tsx`, remover as chamadas de `syncOutlinesIfOnline()` que hoje rodam após:
- criar/editar pasta, mover pasta, excluir pasta;
- criar nota, mover nota (uma ou várias), recortar/colar, excluir nota;
- **reordenar via arrastar-e-soltar** (essa é a causa direta da ordem "voltar" para a da nuvem);
- alternar entre subabas.

Essas operações continuam funcionando 100% offline e gravando no armazenamento local imediatamente — só não disparam mais upload silencioso.

### 3. Manter (e tornar explícito) o caminho da nuvem
A sincronização continua disponível, mas só roda quando você decidir:
- **Botão "Salvar"** dentro de uma nota → grava local e, se estiver online, faz `syncNow()` daquela alteração (igual hoje). Se estiver offline, fica como rascunho local e sincroniza na próxima vez que você mandar.
- **Diálogo "Nuvem"** (botões já existentes *Enviar para a nuvem* / *Importar da nuvem* / *Excluir da nuvem*) — sem mudanças.
- **Novo botão "Sincronizar agora"** ao lado do botão "Nuvem", para quando você quiser forçar um envio/recebimento em lote (ex.: trocar de aparelho).

### 4. Preservar a ordem manual
Hoje a reordenação local grava `sort_order` corretamente, mas o sync seguinte reescreve a lista a partir da nuvem. Com as mudanças acima:
- a ordem que você definir no celular fica intacta enquanto não pedir sync;
- quando você pedir sync (Salvar ou Sincronizar agora), o `sort_order` local é enviado para a nuvem, então a ordem do celular vira a ordem "oficial".

## O que **não** muda

- Estrutura do banco (`personal_outlines`), RLS, server functions e tabela `private_notes` permanecem iguais.
- "Notas Privadas", "Reuniões", "Escala", "Checklist", "Perfil", backup automático e qualquer outra aba **não** são tocados.
- O editor `RichNoteEditor` e a barra de ferramentas continuam exatamente como ficaram nas últimas alterações.
- Lixeira continua funcionando (soft-delete local; sobe pra nuvem quando você sincronizar).

## Riscos e como ficam controlados

- **Dois aparelhos editando a mesma nota** → quem sincronizar por último ganha (LWW por `updated_at`), igual hoje. Diferença: agora isso só acontece quando alguém aperta Salvar/Sincronizar, não em segundo plano.
- **Esquecer de sincronizar** → adicionamos um indicador discreto "alterações locais não enviadas" no cabeçalho da aba, usando a flag `dirty` que já existe em cada nota.
- **Reinstalar o app sem ter sincronizado** → as notas locais não enviadas se perdem (mesmo risco de qualquer app offline-first). O indicador acima ajuda a lembrar.

## Resumo técnico (para referência)

Arquivos tocados:
- `src/hooks/use-outlines-sync.ts` — remover listeners automáticos; manter `syncNow`.
- `src/routes/_app.tsx` — remover chamada `useOutlinesSync()`.
- `src/routes/_app.consideracoes-campo.tsx` — remover todos os `syncOutlinesIfOnline()` exceto o do botão **Salvar**; adicionar botão **Sincronizar agora** e badge "alterações locais não enviadas".

Nenhuma migração de banco, nenhuma alteração em outras abas.
