# Grandes Eventos (e outras telas) não chegam aos outros aparelhos

## A falha encontrada
Os eventos **estão salvos na conta** na nuvem (conferi: a conta tem os eventos lá). O problema é que o outro aparelho **nunca chega a buscá-los**:

- O app lê primeiro a cópia guardada no próprio celular, para abrir rápido e funcionar sem internet.
- A sincronização deveria "furar" essa cópia e ir à nuvem. Mas o **⟳ desta tela**, a sincronização automática diária e a atualização ao abrir Grandes Eventos pedem os dados à nuvem **sem avisar que é uma sincronização**. Resultado: o próprio app responde com a cópia antiga do celular, e nada novo chega.
- Mesmo quando o "Sincronizar tudo" do Perfil baixa os eventos, a tela pode continuar mostrando a **lista antiga já guardada**, porque essa lista não é marcada como desatualizada.

Isso afeta qualquer tela que use o ⟳ da tela, não só Grandes Eventos. Esboços e cartas modelo usam outro caminho e por isso funcionavam.

## O que vou corrigir
1. **Toda sincronização vai mesmo à nuvem:** ⟳ da tela, sincronização diária, Perfil e a atualização ao abrir Grandes Eventos.
2. **Depois de baixar, a tela mostra o novo:** as listas guardadas das tabelas baixadas passam a ser consideradas desatualizadas, e a tela recarrega.
3. **Ao abrir Grandes Eventos com internet:** baixa eventos **e** partes (hoje só baixa as respostas), e atualiza a lista inteira: novos aparecem, editados mudam, excluídos somem.
4. **Sem internet:** nada muda, continua usando a cópia do celular.

```text
Aparelho A cria "Assembleia 2027"  →  salvo na nuvem
Aparelho B abre Grandes Eventos (ou toca ⟳)
   → busca de verdade na nuvem → "Assembleia 2027" aparece
```

Sem mudanças no visual, links, PINs, cartas ou relógio. Sem mudança no banco.

## Detalhes técnicos
- Causa: `syncTables`/`supabasePull` passa pelo `createLocalFirstFetch`; fora de `withNetworkWindow`, `preferNetworkNow()` é falso e a leitura é respondida pelo espelho (`answerFromMirror`) ou pela cópia em `response-cache`. Só `runDeviceSync` abre a janela; `SyncButton` (tela), `runAutoSync` (diária/abertura/online), `ConnectionModeToggle` e `BigEvents.refreshStatuses` não.
- Correção central em `local-sync.ts`: `syncTables` executa dentro de `withNetworkWindow` (cobre todos os chamadores) e, após gravar linhas de uma tabela, chama `markTableStale(table)`.
- `BigEvents.tsx`: `refreshStatuses` sincroniza `circuit_big_events` + `circuit_big_event_parts` e recarrega ambas do espelho via `getRows`.
- Testes: `syncTables` abre a janela de rede durante o pull e marca as tabelas como desatualizadas; regra registrada em `src/lib/AGENTS.md`.
- Verificar com Playwright: evento inserido na nuvem com espelho já preenchido aparece após ⟳ da tela e ao reabrir a tela.
