# Gravação real e offline do espaço da esposa (só no aparelho)

## O que muda para ela
- Tudo o que ela escreve, cria ou apaga (anotações, pastas, pesquisas, leitura da Bíblia e destaques) aparece na hora e fica guardado no aparelho.
- Atualizar a página (F5), fechar o navegador ou ficar sem internet não apaga nada.
- O texto é salvo sozinho enquanto ela digita, com um aviso discreto de "Salvo".
- Para levar tudo a outro aparelho, ela usa o backup .zip que já existe. Nada vai para o servidor, e o banco de dados não muda.
- Cada código de convite tem o seu espaço separado. Se outra pessoa entrar com outro código no mesmo aparelho, não vê as anotações dela.
- A "Semana da Visita" não muda.

## Detalhes técnicos
- Guardar no IndexedDB com `idb-keyval`, na chave `guest.workspace.<sessionKey>.data`. `sessionKey` é uma impressão digital (hash) do código de convite tirada de `readGuestSession()`, para o código não ficar gravado em texto puro. Fora do navegador, ou se o IndexedDB falhar, usa o localStorage como reserva.
- Migração em uma única vez: se existir a chave antiga no localStorage, `guest.workspace.data`, os dados passam para a nova chave e a antiga é apagada.
- `guest-workspace-store.ts`:
  - `loadWs(sessionKey)` e `saveWs(sessionKey, d)` passam a ser assíncronos.
  - As gravações esperam 400 ms sem novas mudanças antes de salvar.
  - Ao esconder a aba (`visibilitychange`) ou sair da página (`pagehide`), salva na hora o que estiver pendente.
  - Tudo continua passando pelo `sanitizeWs` ao ler.
- `GuestWorkspace.tsx`: a tela muda primeiro (estado local) e a gravação acontece em seguida. Enquanto os dados carregam, mostra uma tela de espera simples. O `FocusEditor` salva título e texto enquanto ela digita.
- Leitura da Bíblia e destaques: os itens `bible` guardam o progresso no próprio espaço dela. O histórico de versículos que já existe (`bible:history:v1`) entra no backup.
- Não usar `local-write.ts` nem `offline-queue.ts`, porque os dois enviam ao servidor. Isso foge da escolha "só no aparelho".
- O backup e a restauração passam a usar o espaço do código de convite ativo.
- Testes no vitest, usando `fake-indexeddb` ou uma versão simulada do `idb-keyval`:
  - os dados continuam lá depois de recarregar;
  - um código de convite não enxerga os dados de outro;
  - a migração a partir do localStorage funciona;
  - apagar um item continua valendo depois de recarregar.
- Conferir com `tsgo` e `vitest`.
- No `AGENTS.md`, atualizar a regra do espaço da esposa: os dados ficam no IndexedDB, separados pelo código de convite, sem fila de envio ao servidor.
