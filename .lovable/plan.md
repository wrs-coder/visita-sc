# Corrigir: PIN no modo avião mostra "Acesso liberado" mas não abre o app

## Causa confirmada
Ao confirmar o PIN, o cofre abre corretamente e guarda a "sessão local" do usuário. Porém, quem decide se há alguém conectado só lê essa sessão local **uma vez, quando o app é aberto**. Sem internet, a restauração da sessão do servidor não acontece (nem é tentada no modo avião), então nenhum aviso de "usuário entrou" é disparado. O app volta para a página inicial, continua achando que não há ninguém conectado e mostra de novo "Entrar sem internet".

Fechar e reabrir o app provavelmente funcionaria — o que confirma que falta apenas avisar o app no momento do desbloqueio.

## O que será feito
1. No momento do desbloqueio por PIN ou digital, quando não houver servidor, o app passa a reconhecer o usuário **na hora**, usando o retrato de perfil guardado no cofre, e entra no Modo Offline.
2. Só depois disso a tela navega para a página inicial, que então leva ao painel ou cronograma conforme o cargo.
3. Com internet, nada muda: a sessão real do servidor continua tendo prioridade.

## Detalhes técnicos
- `src/hooks/use-auth.tsx`: extrair a lógica de hidratação offline (hoje dentro de `getSession().then`) para uma função `enterOfflineSession()`; expor no contexto e também escutar um evento `visita-sc:offline-session` em `window` para chamá-la. Ela faz `setMode("offline")`, monta o `User` sintético, `hydrateCachedUserData`, `setLoading(false)`.
- `src/lib/offline-session.ts`: `saveOfflineSession` continua igual; nova função `announceOfflineSession()` dispara o evento.
- `src/components/auth/PinUnlockPanel.tsx`: em `applyPayload`, quando `online === false`, chamar `announceOfflineSession()` antes de `onUnlocked()` (que navega para `/`).
- Garantir que o retrato de perfil vazio no cofre não bloqueie: se não houver snapshot, montar um mínimo a partir do payload.
- Sem mudanças em banco, RLS, Bíblia, fila offline ou login com senha.
- Validação: typecheck, testes e teste no navegador com rede simulada offline (PIN → app abre). No aparelho é necessário gerar novo APK/AAB (versão 4.2.11 / versionCode 21, alinhada em `package.json`, `LoginForm.tsx` e `build.gradle`).
