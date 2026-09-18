# Diagnóstico e correção do login Android por domínio personalizado

## Diagnóstico confirmado

- A versão 4.0.0 não usava uma casca local: o aplicativo abria diretamente `https://visita-sc.lovable.app`. Página, login e funções do servidor eram da mesma origem, portanto não dependiam de comunicação entre domínios.
- A versão 4.2.0 mudou para uma casca empacotada no aparelho, cuja origem é `https://localhost`. O login passou a depender de chamadas entre essa origem local e um dos três domínios publicados.
- O login atual executa duas operações de rede dentro do mesmo tratamento de erro:
  1. resolve usuário/telefone por uma função do servidor, encaminhada ao domínio selecionado;
  2. autentica a senha diretamente no serviço de autenticação do backend.
- A mensagem “Não foi possível conectar ao servidor” não identifica qual dessas operações falhou. Ela também mascara erros de configuração como se fossem falha de internet.
- Os três endereços respondem agora ao teste `/api/public/ping` com HTTPS válido e autorização para `Origin: https://localhost`. Os domínios personalizados e o endereço `lovable.app` servem a mesma publicação. Não há bloqueio por domínio no banco de dados.
- O problema estrutural é, portanto, o novo fluxo híbrido da 4.2.0: a entrada depende de uma função RPC do framework atravessando domínios a partir da WebView. Esse caminho não existia na 4.0.0 e é o ponto frágil anterior à autenticação. A configuração `allowNavigation` não libera requisições de dados; ela só controla navegação de páginas.
- É possível usar `visitasc.com.br` no aplicativo. A solução correta é manter a casca local, mas retirar do primeiro login a dependência desse transporte RPC entre origens.

## Implementação proposta

### 1. Criar uma entrada HTTP estável para o login nativo

- Criar uma rota pública JSON específica para resolver usuário, telefone ou e-mail.
- Validar entrada, limitar tamanho e devolver somente o identificador necessário para autenticação, sem expor perfil ou existência de dados além do comportamento atual.
- Aplicar a mesma lista restrita de origens e responder corretamente a `OPTIONS`.
- Não registrar senha, token ou identificador completo em logs.
- Manter o login por e-mail e senha diretamente no serviço de autenticação, como já funciona na versão 4.0.0; nenhuma senha será armazenada ou intermediada pelo servidor do app.

### 2. Tornar o cliente Android determinístico

- No aplicativo instalado, chamar a nova rota HTTP usando `visitasc.com.br`, `www.visitasc.com.br` e `visita-sc.lovable.app`, com tempo limite e contingência controlada.
- Aceitar uma origem somente quando a resposta tiver a marca esperada do servidor e o formato JSON válido; um simples `204` não será considerado prova suficiente de que o login completo funciona.
- Memorizar apenas a última origem funcional e invalidá-la diante de falha real de transporte.
- No navegador, preservar o fluxo de mesma origem e o comportamento atual.

### 3. Separar e diagnosticar as etapas do login

- Tratar separadamente: resolução do usuário, autenticação da senha e leitura da função do usuário.
- Mostrar “credenciais inválidas” somente para resposta real de autenticação; falhas de transporte continuarão sem revelar informações sensíveis.
- Registrar localmente, sem dados pessoais ou segredos, etapa, host, código HTTP, tempo e tipo de falha.
- Acrescentar aos detalhes de conexão um teste real da rota de resolução, além do ping, para distinguir DNS/TLS, autorização entre origens e indisponibilidade do backend.

### 4. Preservar segurança e compatibilidade

- Não alterar tabelas, políticas de acesso, usuários, senhas, esboços, textos bíblicos, PIN ou biometria.
- Não armazenar a senha do login e não mover a validação de senha para código local.
- Preservar o desbloqueio offline já criado como alternativa somente para contas previamente autenticadas.
- Manter o domínio `lovable.app` como contingência, sem torná-lo obrigatório.

## Validação obrigatória

- Testar `GET`, `OPTIONS` e a nova chamada `POST` a partir de `https://localhost` e `capacitor://localhost` nos três domínios.
- Testar usuário inexistente, senha incorreta, login válido, servidor primário indisponível e troca automática de domínio.
- Validar a casca empacotada, e não apenas o site: conferir arquivos copiados para o Android e executar o fluxo em contexto equivalente à WebView.
- Confirmar que nenhum log contém senha, token, e-mail completo ou dados pessoais.
- Executar testes focados, verificação TypeScript e build; somente depois preparar APK/AAB com novo `versionCode`.

## Resultado esperado

O APK/AAB continuará Offline-First, usará `visitasc.com.br` como endereço preferencial e conseguirá autenticar sem depender do transporte RPC entre origens que diferencia a 4.2.0 da 4.0.0. O endereço `visita-sc.lovable.app` permanecerá como contingência, e eventuais falhas futuras indicarão precisamente a etapa afetada em vez da mensagem genérica atual.
