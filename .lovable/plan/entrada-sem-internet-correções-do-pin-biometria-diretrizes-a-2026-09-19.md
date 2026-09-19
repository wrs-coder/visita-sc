# Entrada sem internet: correções do PIN/biometria + diretrizes atualizadas

## O que está errado hoje

1. **Trava na tela de entrada (modo avião).** Ao abrir o cofre com PIN/biometria, o app tenta
   restaurar a sessão no servidor e fica esperando uma resposta que nunca chega. Sem resposta,
   a tela congela; quando passa, o app entende que ninguém está conectado e volta a mostrar
   "criar conta".
2. **A janela de criação do PIN não fecha.** Hoje ela só fecha depois que toda a ativação da
   digital/rosto termina. Se o aparelho demora ou o usuário confirma em outra ordem, a janela
   fica aberta e parece que nada foi concluído.
3. As diretrizes do projeto (`instructions.md`) ainda não descrevem o acesso sem internet,
   o transporte nativo dos três endereços e as regras de versão do aplicativo.

## O que será feito

### A. Entrar de verdade sem internet
- Detectar ausência de rede antes de tentar o servidor e, nesse caso, entrar direto em modo
  sem internet.
- Colocar um limite de tempo curto na tentativa de restaurar a sessão, para nunca congelar.
- Guardar uma "sessão local" a partir do cofre (identificação, e-mail e retrato de perfil já
  baixado) para o app reconhecer o usuário mesmo com o servidor inacessível.
- O acesso do app passa a aceitar essa sessão local quando não há sessão do servidor: as
  páginas abrem com os dados já baixados, e tudo volta ao fluxo normal assim que houver rede.
- Nada muda para quem entra com internet: usuário e senha continuam idênticos.

### B. Fechar a janela do PIN na confirmação
- Ao confirmar o PIN, a janela fecha imediatamente e avisa o sucesso.
- A ativação da digital/rosto passa a acontecer logo após o fechamento, com aviso próprio de
  sucesso ou de "não foi possível ativar agora" — sem prender a janela.
- Mesmo comportamento no cartão de gerenciamento dentro de "Meu perfil".

### C. Atualizar `instructions.md`
Novas seções de diretrizes:
- Acesso sem internet: senha nunca é guardada; apenas sessão e retrato cifrados; PIN de 6
  dígitos com validade de 30 dias, bloqueio progressivo e destruição do cofre; biometria é
  atalho, o PIN é a recuperação garantida.
- Conexão do aplicativo instalado: transporte nativo HTTPS, lista fixa dos três endereços,
  sem depender de permissões do navegador, e verificação da casca antes de gerar o pacote.
- Versão: alinhar sempre `package.json`, tela de entrada e configuração do Android na mesma
  alteração.

## Detalhes técnicos

- `src/components/auth/PinUnlockPanel.tsx`: `applyPayload` checa `navigator.onLine`, aplica
  `Promise.race` com timeout (~4s) em `supabase.auth.setSession`, e grava a sessão local antes
  de navegar.
- Novo `src/lib/offline-session.ts`: leitura/escrita da sessão local derivada de `VaultPayload`
  (userId, email, perfil), limpa em `clearVault`/logout explícito.
- `src/hooks/use-auth.tsx`: quando `supabase.auth.getSession()` não devolve sessão e existe
  sessão local válida, hidrata `user`, `profile`, `role`, `elderPosition` e `congregation` a
  partir do snapshot e mantém `loading` encerrado; sessão real do servidor sempre tem prioridade.
- `src/components/auth/PinSetupDialog.tsx` e `src/components/auth/OfflinePinCard.tsx`: fechar o
  diálogo/limpar estado imediatamente após `createVault`, disparando a biometria em seguida.
- `instructions.md`: novas seções 13–15 seguindo o formato atual.
- Sem mudanças em banco, RLS, esboços, textos bíblicos, fila offline ou login online.
- Validação: `bunx vitest run`, `bunx tsgo --noEmit`, build, e teste da tela de entrada com
  rede simulada offline.
