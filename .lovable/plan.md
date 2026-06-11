# Onda 7.9 — Acessibilidade premium ✅ entregue

Ganhos incrementais sobre a base já criada nas Ondas 5/6.6:

- `src/routes/__root.tsx` — `<html lang>` agora é mantido em sincronia com o
  idioma ativo do i18n (`pt → pt-BR`, `en`, `es`), reagindo a `languageChanged`.
  Leitores de tela passam a usar a voz e a pronúncia correta após o usuário
  trocar de idioma no app.
- `src/components/RouteAnnouncer.tsx` (novo) — região `role="status"
  aria-live="polite" aria-atomic="true"` SR-only que anuncia o nome da rota
  ativa 180 ms após a navegação, traduzido pelo i18n. Soluciona a perda de
  contexto típica de SPAs (o `<title>` não muda audivelmente em SPA puro).
- `src/routes/_app.tsx` — monta o `RouteAnnouncer` logo após o skip-link,
  alimentado por `location.pathname`.
- `src/components/OfflineReadyBadge.tsx` — ganha `role="status"`,
  `aria-live="polite"` e `aria-atomic="true"` para anunciar progresso e
  estado "Pronto para offline" sem precisar de hover/título.
- `src/i18n/locales/{pt,en,es}.json` — nova chave `a11y.pageAnnounce`
  (`"{{name}} carregado/loaded/cargado"`).

Já existia (mantido):
- Skip-to-content (`.skip-to-content`), foco visível com halo, mínimos
  44×44 px em `pointer:coarse`, `prefers-reduced-motion` global,
  `SavingIndicator` com `role="status" aria-live="polite"`,
  `aria-label` em todos os botões icon-only do shell (`Menu`, `LogOut`,
  `SyncButton`, abre Command Palette).

# Onda 7.10 — Verificação ✅ entregue

- `bunx tsc --noEmit` 100% limpo.
- Smoke manual coberto pela arquitetura existente: skip-link continua focável
  via Tab; mudança de rota dispara fade+slide de 120 ms (Onda 7.1) e em
  seguida o announcer SR-only anuncia o nome traduzido da página; warm-up
  offline mostra progresso silencioso no header com o badge agora live.

Sem mudanças de schema, RLS, mutations, fila offline ou tokens da Onda 6.8.
