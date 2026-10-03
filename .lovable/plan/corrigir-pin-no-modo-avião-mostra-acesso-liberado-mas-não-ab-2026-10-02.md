# Corrigir: PIN no modo avião mostra "Acesso liberado" mas não abre o app

## Causa confirmada
Ao confirmar o PIN, o cofre abre corretamente e guarda a "sessão local" do usuário. Porém, quem decide se há alguém conectado só lê essa sessão local **uma vez, quando o app é aberto**. Sem internet, a restauração da sessão do servidor não acontece (nem é tentada no modo avião), então nenhum aviso de "usuário entrou" é disparado. O app volta para a página inicial, continua achando que não há ninguém conectado e mostra de novo "Entrar sem internet".

Você confirmou que, ao fechar e reabrir, o app entra — o que confirma que falta apenas avisar o app no momento do desbloqueio.

## Segundo problema: painel sem a congregação e sem o seletor
Ao reabrir sem internet, o painel abre mas não mostra a congregação visitada e o seletor some. O que já foi verificado: a congregação ativa e a lista do seletor são buscadas **direto no servidor** a cada abertura, e não fazem parte da cópia offline baixada no aparelho. Sem servidor, essas buscas falham, o app fica sem congregação ativa e, por consequência, não carrega visita, cronograma, refeições etc. Os esboços aparecem porque não dependem da congregação.

O que será feito:
1. Guardar no aparelho, a cada sincronização online, a lista de congregações do usuário e a congregação ativa.
2. Sem internet, o painel e o seletor passam a usar essa cópia guardada, mostrando a congregação e permitindo trocar entre as já baixadas.
3. Conferir, com o app sem rede, que visita, cronograma, escala, refeições e checklist aparecem a partir da cópia offline já existente; se alguma tela ainda depender só do servidor, corrigir no mesmo passo.
4. Download por período: a cada sincronização, baixar automaticamente **todas as congregações com visita no mês atual** e também **a primeira visita do mês seguinte**, com todos os dados delas (visita, cronograma, escala, refeições, transporte, checklist, reuniões, programa de anciãos). Assim, ao trocar de congregação no seletor sem internet, os dados já estão no aparelho.
5. Mesma estrutura nos dois modos: a entrada sem internet (PIN/digital) e o Modo Offline que você liga manualmente passam a usar o mesmo download do mês e a mesma lista de congregações guardada. Ao ligar o Modo Offline manualmente com internet, o app faz antes esse download, se ainda não tiver sido feito hoje.

## O que será feito
1. No momento do desbloqueio por PIN ou digital, quando não houver servidor, o app passa a reconhecer o usuário **na hora**, usando o retrato de perfil guardado no cofre, e entra no Modo Offline.
2. Só depois disso a tela navega para a página inicial, que então leva ao painel ou cronograma conforme o cargo.
3. Com internet, nada muda: a sessão real do servidor continua tendo prioridade.

## Detalhes técnicos
- `src/hooks/use-auth.tsx`: extrair a lógica de hidratação offline (hoje dentro de `getSession().then`) para uma função `enterOfflineSession()`; expor no contexto e também escutar um evento `visita-sc:offline-session` em `window` para chamá-la. Ela faz `setMode("offline")`, monta o `User` sintético, `hydrateCachedUserData`, `setLoading(false)`.
- `src/lib/offline-session.ts`: `saveOfflineSession` continua igual; nova função `announceOfflineSession()` dispara o evento.
- `src/components/auth/PinUnlockPanel.tsx`: em `applyPayload`, quando `online === false`, chamar `announceOfflineSession()` antes de `onUnlocked()` (que navega para `/`).
- Garantir que o retrato de perfil vazio no cofre não bloqueie: se não houver snapshot, montar um mínimo a partir do payload.
- `src/hooks/use-active-congregation.ts` e o seletor em `src/routes/_app.tsx`/`_app.dashboard.tsx`: snapshot `visita-sc:congregations:<uid>` (lista + ativa) gravado quando as consultas têm sucesso; em `isOfflineMode()` ou falha de rede, usar o snapshot como `initialData`/fallback (sem disparar a consulta).
- Rodar o painel com rede bloqueada no navegador e listar quais consultas ainda vão ao servidor, corrigindo as que impedem a visita de aparecer.
- Escopo do download (`local-sync`/warm-up): selecionar visitas com `start_date`/`end_date` dentro do mês atual + a primeira visita com `start_date` no mês seguinte; incluir as congregações delas no snapshot do seletor. A poda passa a preservar esse conjunto.
- Sem mudanças em banco, RLS, Bíblia, fila offline ou login com senha.
- Validação: typecheck, testes e teste no navegador com rede simulada offline (PIN → app abre). No aparelho é necessário gerar novo APK/AAB (versão 4.2.11 / versionCode 21, alinhada em `package.json`, `LoginForm.tsx` e `build.gradle`).
