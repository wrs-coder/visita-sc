# Corrigir definitivamente o login do APK/AAB

## Diagnóstico confirmado

O banco e a autenticação estão ativos, e os dois domínios próprios estão conectados. O defeito ocorre antes do login chegar ao banco:

- O APK roda localmente em `https://localhost` e chama o servidor em outro domínio.
- A primeira etapa do login, que identifica usuário/e-mail/telefone, é uma chamada interna do aplicativo.
- Essa chamada envia obrigatoriamente o cabeçalho `x-tsr-serverfn`.
- A resposta CORS atual não inclui `x-tsr-serverfn` em `Access-Control-Allow-Headers`.
- Por isso o WebView bloqueia a primeira etapa do login. O botão termina sem autenticar e o aplicativo permanece na página inicial.
- Nos sites isso não ocorre, pois a página e o servidor usam a mesma origem e não dependem desse preflight CORS.
- O endpoint de diagnóstico `/api/public/ping` responde, mas não reproduz os cabeçalhos reais do login; portanto ele pode informar conexão mesmo quando o login continua bloqueado.

Nenhuma alteração no banco de dados é necessária.

## Implementação

1. **Corrigir o CORS das chamadas internas**
   - Autorizar todos os cabeçalhos realmente utilizados pelo protocolo atual, incluindo `x-tsr-serverfn`, `x-tss-raw` e `x-tss-context`.
   - Manter a lista fechada às origens já aprovadas: aplicativo local, `visitasc.com.br`, `www.visitasc.com.br` e o endereço Lovable como última contingência.

2. **Tornar a seleção do servidor confiável**
   - Validar a origem com uma chamada que confirme a identidade e compatibilidade do servidor, não apenas “qualquer resposta HTTP”.
   - Priorizar permanentemente `visitasc.com.br`, usar `www.visitasc.com.br` em seguida e deixar `visita-sc.lovable.app` somente como última alternativa.
   - Tentar todas as origens disponíveis quando houver erro de rede, CORS ou resposta incompatível, em vez de apenas uma segunda tentativa.
   - Evitar que uma origem antiga memorizada mantenha o aparelho preso ao endereço indisponível.

3. **Dar retorno correto no login**
   - Tratar falhas na resolução do identificador e na autenticação sem deixar o botão silenciosamente voltar ao estado inicial.
   - Exibir mensagem clara de conexão quando nenhuma origem válida puder concluir o login.
   - Preservar sessão, modo offline e redirecionamento por função existentes.

4. **Adicionar testes de regressão específicos**
   - Verificar o preflight real do login vindo de `https://localhost`.
   - Simular indisponibilidade de `visita-sc.lovable.app` e confirmar login por `visitasc.com.br`.
   - Testar origem memorizada indisponível, troca Wi‑Fi/4G e resposta HTTP inválida.
   - Confirmar que login por usuário, e-mail e telefone continua funcionando.

5. **Gerar uma nova versão Android segura**
   - Atualizar para versão `4.1.4` com novo `versionCode`.
   - Gerar e validar a casca local, sincronizar os arquivos Android e conferir que todos os arquivos necessários estão dentro do APK/AAB.
   - Validar TypeScript, build e endpoints sem alterar tabelas, políticas, senhas, dados ou chaves.

## Limites de segurança

- Não alterar o banco de dados nem seus registros.
- Não trocar o sistema de autenticação.
- Não remover o funcionamento offline.
- Não mudar esboços, timer, sincronização ou demais telas.
- Não voltar a carregar o site remoto dentro do aplicativo.
