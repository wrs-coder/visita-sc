# Onda 7.11 — Missão 05B (Warm-up incremental) ✅ entregue

Acaba com o download redundante do servidor a cada login/reinicialização.
O app agora confia no cache e só baixa o que mudou de fato.

## Como funciona

### Gate exterior (24h + congregação)
`src/hooks/use-offline-warmup.ts`
- Antes de qualquer sondagem, lê `localStorage["visita-sc:last-warmup"]`.
- Se o último warm-up foi há menos de **24h** E a congregação ativa não
  mudou → marca `done: true` e **encerra** sem nenhuma requisição.
- Em logout deliberado, `__root.tsx` agora limpa
  `visita-sc:last-warmup` e `visita-sc:warmup-session` (junto com
  `queryClient.clear()`).

### Sondagem por passo
`src/lib/offline-prefetch.ts`
- Cada passo declara `tables: string[]`. Antes de baixar:
  1. Faz `select("updated_at").order(desc).limit(1)` em paralelo nas
     tabelas do passo (~1 linha cada, custo desprezível).
  2. Compara cada `max(updated_at)` com o baseline em
     `last-warmup.tables[<tabela>]`.
  3. **Se todas batem** → passo é pulado por completo. Cache do React
     Query (persistido em IndexedDB) supre a tela.
  4. **Se alguma mudou** → re-fetch do passo inteiro (evita merges
     complexos com `.in('visit_id', visitIds)`).
- Ao final, grava `{ at, congId, userId, tables: {...} }` em
  `localStorage["visita-sc:last-warmup"]`. Troca de usuário ou de
  congregação descarta o baseline antigo automaticamente.
- Novo parâmetro `force?: boolean` em `prefetchAllForOffline` permite
  refetch obrigatório (não usado por padrão — sondagem já garante
  correção).
- Log final: `[offline-prefetch] warm-up concluído — baixados: X •
  pulados (cache fresco): Y • erros: Z` (visível no console para
  diagnose).

## Comportamento esperado

| Cenário | Resultado |
|---|---|
| Login na mesma aba, <6h | Skip total (sessão) |
| Novo login, <24h, mesma cong | Skip total (gate 24h) — zero requests |
| Novo login, >24h, nada mudou no servidor | ~25 sondas de 1 linha; zero refetch |
| Novo login, 2 tabelas mudaram | ~25 sondas; refetch só desses 2 passos |
| Troca de congregação | Baseline descartado → warm-up completo |
| Logout deliberado | `last-warmup` removido; novo login = warm-up completo |

## Verificação
- `bunx tsc --noEmit` 100% limpo.
- Console mostra contadores `baixados / pulados / erros` ao final.

## Missões anteriores
- 05A — Persistência de login blindada ✅
- 7.4b — Cache de contingência em modo online ✅

## Próximas missões
- 01 — Backup com cobertura total (IDB + LS genéricos).
- 02 — Subaba "Anotações" em Esboços Pessoais.
- 03 — Popup bíblico persistente em Tela Cheia.
- 04 — Olho expandido no cartão "Pastoreiem".
