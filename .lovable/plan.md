## Objetivo

Evitar que o utilizador fique "preso" fora do aplicativo quando estiver em Modo Offline. Duas mudanças:

1. **Nunca deslogar em Modo Offline** — nem por expiração de token, nem por clique manual em "Sair".
2. **Botão "Desativar Modo Offline" na tela de login** — visível apenas quando o app está em Modo Offline, posicionado no lado oposto ao seletor de idioma, para o utilizador conseguir voltar ao Modo Online e fazer login normalmente.

---

## Mudanças

### 1. Bloquear logout em Modo Offline

**`src/hooks/use-auth.tsx`** — função `signOut`:

- Se `isOfflineMode()` for `true`, **não chamar** `supabase.auth.signOut()`. Mostrar `toast.warning(t("connection.cannotLogoutOffline"))` explicando que é preciso voltar ao Modo Online antes de sair.
- O listener `onAuthStateChange` já ignora eventos não-`SIGNED_IN` em offline, então tokens expirados continuam sendo absorvidos. Reforço extra: dentro do `signOut`, sair cedo antes mesmo de qualquer chamada de rede.

### 2. Botão de desativar offline na tela de login

**`src/components/auth/LoginForm.tsx`**:

- Trocar o cabeçalho da página (linha 62) de `flex justify-end` para `flex justify-between items-center`.
- À **esquerda**: quando `offline === true`, renderizar um botão "Desativar Modo Offline" (ícone `Wifi` + label `t("connection.disableOfflineMode")`) no mesmo estilo visual claro/inverso do `LanguageSwitcher`. Quando online, renderizar um spacer vazio (`<div />`) para manter o alinhamento à direita.
- À **direita**: o `<LanguageSwitcher variant="inverted" />` existente.
- Ao clicar no botão: chamar `setMode("online")` de `@/lib/connection-mode` e mostrar `toast.success(t("connection.nowOnline"))`. Isso já é suficiente — o `useConnectionMode()` re-renderiza o form, libera o campo de submit e o aviso `firstLoginNeedsInternet` desaparece.
- Não precisa de Dialog de confirmação aqui: o utilizador está bloqueado fora; o caminho deve ser rápido.

### 3. Novas chaves i18n

Adicionar em `src/i18n/locales/{pt,en,es}.json`, dentro de `connection`:

- `disableOfflineMode` — "Desativar Modo Offline" / "Disable Offline Mode" / "Desactivar Modo Sin Conexión"
- `cannotLogoutOffline` — "Não é possível sair no Modo Offline. Volte ao Modo Online primeiro." (+ traduções)

---

## Fora de escopo

- Mudanças na lógica de prefetch / queue / cache.
- Mudar a regra "primeiro login precisa de internet" — ela continua válida; o botão novo só ajuda a sair do offline quando o utilizador já tem sessão prévia mas o app está travado.
- Nenhuma mudança em backend, schema, RLS ou APK.
