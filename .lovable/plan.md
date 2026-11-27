# Modo sem internet do Visita SC — investigar e corrigir

## O que já conferi
- Nos últimos dias não mudei a parte do app que guarda as telas para uso sem internet. A única mudança (23/11) foi fazer o app **ignorar** as páginas das ferramentas (Conversor S-21 e Analisador), para elas não ocuparem espaço.
- O Analisador tem seu próprio guardador de telas, mas ele só apaga coisas dele mesmo; não apaga as cópias do Visita SC.
- A versão 6.0.2 mudou só as novidades, o bloqueio das ferramentas no pacote Android e o título da tela de entrada.
- Ainda **não sei a causa**. Não vou adivinhar: o primeiro passo é reproduzir o erro.

## Passos
1. **Reproduzir** num celular simulado: entrar, tocar em Sincronizar no Perfil, desligar a internet e abrir o Dashboard, a Agenda, os Esboços, a Visita e o Pastoreio. Anotar qual tela mostra "página não exibida".
2. **Conferir no iPad (navegador/atalho na tela)**: se as telas abertas ficam guardadas e se a tela de entrada consegue abrir sem internet.
3. **Conferir no Android (app da Play Store)**: se o pacote 6.0.2 leva todas as telas dentro dele, e se a nova conferência de versão deixou alguma tela de fora.
4. **Corrigir só a causa encontrada**, sem mudar o visual nem como os dados são guardados.
5. **Teste guardião**: um teste que falha se uma tela principal deixar de abrir sem internet depois da sincronização.
6. Se a correção for no app Android, preparar versão 6.0.3 (versionCode 52).

## Detalhes técnicos
- Arquivos a revisar: `public/sw.js` (navegação NetworkFirst e fallback de HTML), `src/components/PwaRegister.tsx`, `src/lib/offline-prefetch.ts`, `offline-shells`, `scripts/build-app-shell.mjs` e `scripts/check-shell-fresh.mjs` (casca `dist-app`).
- Hipóteses a testar: cópias HTML ligadas a arquivos de versão anterior após publicar; casca Android sem alguma rota; sincronização que grava dados mas não as telas.
- Playwright com `context.set_offline(True)` após a sincronização.
