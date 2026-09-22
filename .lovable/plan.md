# Offline-First do Visita SC — o que ainda falta

As fases 0 a 4 estão completas: espelho local, carimbos de data, registro de exclusões, leitura local nas telas, envio do que foi feito offline e sincronização automática duas vezes por dia com painel no Perfil.

Ainda restam cinco pontos que fazem diferença no uso real, em ordem de impacto.

## 1. Esboços não entram na sincronização automática (prioridade alta)

Hoje a lista de dados baixados automaticamente cobre congregações, cronograma, escala, refeições, transporte, checklist, reuniões de campo e notas. Os esboços pessoais ficaram de fora, então só chegam ao aparelho quando a tela é aberta com internet.

Correção: incluir os esboços (e as reuniões/discursos ligados a eles) na lista de download automático, com o mesmo tratamento de exclusões.

## 2. Anexos de esboço não viajam entre aparelhos

Fotos e vídeos ficam gravados só no aparelho que os adicionou. Em outro celular aparece "Anexo indisponível neste aparelho".

Correção: enviar o arquivo para o armazenamento da nuvem quando houver boa conexão e baixá-lo sob demanda no outro aparelho, mantendo a cópia local como fonte principal. Fotos continuam reduzidas a 2000 px.

## 3. O espelho local cresce sem limite

O espelho guarda tudo o que foi baixado, sem limpeza. Em aparelhos com pouco espaço isso pode virar problema, e nada avisa o usuário.

Correção: medir o espaço usado, mostrar no painel do Perfil e limpar automaticamente dados antigos de semanas/congregações que não são mais usadas, nunca apagando o que está pendente de envio.

## 4. Alterações pendentes sem visibilidade real

O painel mostra só a quantidade de alterações pendentes. Se uma delas falhar repetidamente, o usuário não sabe qual é nem consegue tentar de novo individualmente.

Correção: listar as pendências com descrição simples, data e botão de "tentar de novo"; sinalizar quando uma alteração foi substituída por uma versão mais nova vinda de outro aparelho.

## 5. Primeiro acesso em aparelho novo continua dependente da tela aberta

Ao instalar em um celular novo, o app só enche o espelho conforme as telas são visitadas. Se o usuário abrir o app e depois ficar sem internet, faltam dados.

Correção: oferecer, logo após o login, um "baixar tudo agora" com barra de progresso, usando a mesma sincronização já existente.

## Detalhes técnicos

- `src/lib/local-auto-sync.ts`: acrescentar `personal_outlines` e tabelas relacionadas em `AUTO_SYNC_TABLES`; confirmar que cada uma tem `updated_at` e gatilho de tombstone (a migração da Fase 1 cobriu 39 tabelas — validar antes).
- Anexos: novo módulo de upload/baixa apoiado em `src/lib/outline-attachments.ts` e no bucket de armazenamento do backend, com fila reaproveitando `offline-queue.ts`.
- Espaço: `navigator.storage.estimate()` + rotina de poda em `src/lib/local-db.ts`, preservando registros com `dirty = true`.
- Pendências: expor a fila de `offline-queue`/`local-write` no `SyncStatusCard.tsx`.
- Download inicial: `syncTables` com `force: true` e progresso, disparado por ação do usuário.
- Sem mudanças em RLS, Bíblia offline ou login por PIN/biometria. Versão sugerida ao fechar: 4.2.7/versionCode 17.

## Execução sugerida

Etapa A: itens 1 e 5. Etapa B: item 2. Etapa C: itens 3 e 4.
