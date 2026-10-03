# Corrigir o botão "Sair" e o "Remover acesso offline" no aplicativo

## O que foi encontrado

**Botão Sair (confirmado no código)**
- Ao entrar pelo PIN sem internet, o app liga o Modo Offline automaticamente e ele continua ligado depois, mesmo quando a internet volta.
- Com o Modo Offline ligado, o "Sair" só mostra um aviso e não faz nada — mas logo em seguida o app tenta ir para a tela inicial, que devolve a pessoa ao painel. Parece que o botão "não funciona".
- Quando a entrada foi pelo PIN (sem sessão do servidor), mesmo saindo, o app não limpa o usuário da memória, então a pessoa continua "logada" até fechar o app.

**Remover acesso offline (causa provável, a confirmar no aparelho)**
- A remoção espera o cofre seguro do celular (biometria) responder. No aplicativo instalado essa etapa pode travar ou demorar, e então a tela nunca recebe a confirmação; o cartão continua mostrando o acesso como ativo.
- A tela também não confere se a remoção deu certo de fato antes de mostrar "removido".

## O que será feito

1. **Sair**
   - Se houver internet, permitir sair mesmo com o Modo Offline ligado: desligar o Modo Offline, apagar o acesso offline e encerrar a sessão normalmente.
   - Sem internet, manter a proteção atual (não deixar sair), mas sem levar a pessoa de volta ao painel de forma confusa — só o aviso.
   - Sempre limpar o usuário da memória ao sair (inclusive quando a entrada foi pelo PIN), e voltar para a tela de login.
2. **Remover acesso offline**
   - Apagar primeiro os dados do aparelho (cofre e sessão local) e só depois o cofre seguro da biometria, com limite de tempo para não travar.
   - Conferir que o acesso sumiu antes de mostrar "Acesso offline removido"; se falhar, mostrar um erro claro.
   - Desligar o interruptor de biometria na tela junto.
3. Versão nova 4.2.12 (versionCode 22) para instalar e testar no celular.

## Detalhes técnicos
- `use-auth.tsx` `signOut`: se `isOfflineMode()` e `navigator.onLine`, chamar `setMode("online")` e prosseguir; sempre `setUser/setSession/profile/role/congregation = null` após o logout; retornar booleano para os chamadores só navegarem quando saiu de fato (`_app.tsx`, `CommandPalette.tsx`, `onboarding.tsx`).
- `offline-credentials.ts` `clearVault`: reordenar (idb + localStorage + sessão local antes), `disableBiometric` envolto em timeout (~3s).
- `OfflinePinCard.tsx`: após `clearVault`, `getVaultMeta()`; sucesso só se `null`; zerar `bioOn`; try/catch com toast de erro.
- Bump de versão em `package.json`, `build.gradle`, `LoginForm.tsx` (endpoint de versão só após aprovação na Play Store).
- Sem mudanças no banco, PIN ou biometria além do necessário para remover/sair.
