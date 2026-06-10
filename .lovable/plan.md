# Onda 7.7 — Command Palette expandida ✅ entregue

`src/components/CommandPalette.tsx` ganhou:
- **Recentes**: últimas 5 rotas visitadas (localStorage `visita-sc:cmdk-recents`).
- **Ações rápidas**: Sincronizar agora, Tema claro/escuro, trocar idioma (pt/en/es),
  Apoiar o desenvolvedor, Sair (respeita guard de Modo Offline do `useAuth.signOut`).
- Navegação completa por seção (Principal / Visita / Modelos) mantida.
- Shortcut hint ⌘S no item de sincronização.

i18n: chaves novas em `commandPalette.sectionRecent`, `sectionActions` e `actions.*` (pt/en/es).
Continua 100% client-side, sem consulta ao banco.

`bunx tsc --noEmit` limpo.
