# Onda 7.11 — Missão 05A (Blindagem da persistência de login) ✅ entregue

Garante que o usuário **nunca** seja deslogado automaticamente. A sessão só
termina com clique deliberado em "Sair".

## Mudanças

### `src/hooks/use-auth.tsx`
- `onAuthStateChange` agora:
  - Ignora `TOKEN_REFRESHED` e `INITIAL_SESSION` (eventos ruidosos que
    disparam a cada ~1h e em todo foco de aba, sem trocar identidade).
  - Em `SIGNED_OUT`, só processa se a flag `sessionStorage["visita-sc:logout-intent"]`
    estiver setada. Sem ela, o evento é tratado como espúrio (refresh-token
    recusado por flutuação de rede, 401 transiente) e a sessão local é
    **preservada** — log de aviso para diagnose.
  - `USER_UPDATED` continua recarregando perfil, mas sem entrar em loading.
- `signOut()` marca a flag `logout-intent` antes de chamar
  `supabase.auth.signOut()`, sinalizando que o evento subsequente é
  deliberado. Modo Offline continua bloqueando logout (sem rede não há
  como voltar a entrar).

### `src/routes/__root.tsx`
- Mesma blindagem no listener global:
  - Ignora `TOKEN_REFRESHED`, `INITIAL_SESSION`, `USER_UPDATED`.
  - `SIGNED_OUT` sem `logout-intent` = no-op (não invalida router, não
    limpa cache, não dispara refetch).
  - `queryClient.clear()` só roda em troca real de identidade.

## Onda 7.4b (mantido)
- `src/lib/connection-mode.ts` em Modo Online: se `fetch` ao Supabase
  falhar por rede ou 5xx, serve do `Cache Storage` como contingência.
  Botão "Modo Off-line" continua sendo a ação principal recomendada.

## Verificação
- `bunx tsc --noEmit` 100% limpo.
- Comportamento esperado:
  - Token expira após 1h → `TOKEN_REFRESHED` chega → ignorado pelo listener,
    Supabase JS renova silenciosamente, usuário continua logado.
  - Rede cai durante refresh → `SIGNED_OUT` chega sem `logout-intent` → log
    `[auth] SIGNED_OUT não deliberado ignorado` → sessão e cache preservados.
  - Clique em "Sair" → flag setada → `signOut()` → `SIGNED_OUT` processado
    normalmente → cache limpo, navegação para `/`.

## Próximas missões (em ordem)
- 05B — Warm-up incremental (fim do download redundante).
- 01 — Backup com cobertura total (IDB + LS genéricos).
- 02 — Subaba "Anotações" em Esboços Pessoais.
- 03 — Popup bíblico persistente em Tela Cheia.
- 04 — Olho expandido no cartão "Pastoreiem".
