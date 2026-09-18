# Corrigir definitivamente o acesso do APK ao servidor

## Diagnóstico confirmado pelos novos registros

O Logcat elimina a hipótese de internet, senha, banco ou identificador incompatível:

- O APK chamou o identificador correto e publicado do login: `f5e176a0…`. A normalização Windows/Linux aplicada anteriormente está funcionando.
- A falha ocorre **antes de o pedido de login chegar ao aplicativo servidor**: o navegador interno do Android bloqueia as respostas por CORS.
- Às 15:20 locais, `visitasc.com.br` respondeu sem `Access-Control-Allow-Origin`; `www.visitasc.com.br` e `visita-sc.lovable.app` responderam com redirecionamento, que o navegador proíbe durante o preflight.
- A verificação externa atual confirmou que `visitasc.com.br` agora responde diretamente com HTTP 204 e todos os cabeçalhos CORS, enquanto `www.visitasc.com.br` e `visita-sc.lovable.app` continuam redirecionando para ele. Portanto, esses dois endereços não são contingências reais para chamadas feitas pelo navegador interno.
- O comportamento variável do domínio principal demonstra que depender exclusivamente do CORS da camada de publicação continuará frágil, mesmo com o código do servidor correto.

## Solução

### 1. Usar HTTPS nativo somente no APK/AAB

- Criar uma camada de transporte Android usando o `CapacitorHttp`, já incluído no Capacitor 8 do projeto.
- No aplicativo instalado, enviar a sonda e todas as chamadas `/_serverFn/*` pelo cliente HTTPS nativo, que não executa preflight CORS.
- Converter a resposta nativa novamente para o formato esperado pelo TanStack, preservando status, cabeçalhos e corpo serializado.
- Manter `fetch` normal no site e no preview; o fluxo web não muda.
- Não interceptar arquivos locais, anexos, downloads ou chamadas que não sejam para a lista aprovada de servidores.

### 2. Tratar os domínios conforme o comportamento real

- Usar `https://visitasc.com.br` como destino direto principal.
- Detectar redirecionamentos no transporte nativo e adotar o endereço final permitido, sem tentar executar preflight no endereço intermediário.
- Manter os outros endereços na lista apenas como alternativas de entrada enquanto redirecionarem; não classificá-los como servidores independentes.
- Continuar rejeitando qualquer destino fora da lista explícita do Visita SC.

### 3. Reforçar o servidor sem depender disso para o Android

- Aplicar CORS também no ponto de entrada mais externo do servidor, incluindo respostas de erro, para impedir que falhas internas removam os cabeçalhos.
- Responder `OPTIONS` antes do processamento do framework quando a origem for a casca local autorizada.
- Preservar o CORS atual nas rotas e funções como defesa adicional para clientes web.

### 4. Preservar segurança e funcionamento existente

- Não alterar banco, contas, senhas, autenticação, papéis, políticas de acesso, esboços, Bíblia, cache offline, PIN ou biometria.
- Não armazenar nem registrar usuário, senha, e-mail ou token.
- Continuar exigindo autenticação e autorização do servidor; o transporte nativo remove somente a restrição CORS do navegador, não as proteções de acesso.
- Manter os mesmos limites de tempo, repetição controlada e mensagens específicas por etapa do login.

### 5. Bloquear regressões no pacote Android

- Criar testes do adaptador nativo para sucesso, timeout, erro HTTP, resposta TanStack e redirecionamento permitido/proibido.
- Validar durante o empacotamento que a configuração e o código do transporte nativo foram copiados para `dist-app` e para o projeto Android.
- Atualizar para **4.2.2 / versionCode 12**, pois a correção depende de um novo APK/AAB.

## Validação obrigatória

1. Testar no navegador e confirmar que o login web continua usando o fluxo atual.
2. Testar no Android com `visitasc.com.br`, verificando no Logcat que não existe preflight nem erro CORS para ping ou `/_serverFn/*`.
3. Testar usuário inexistente, senha incorreta, login válido e carregamento do papel do usuário.
4. Após o login, abrir e sincronizar páginas que usam funções protegidas para provar que a correção cobre todo o aplicativo, não apenas a primeira etapa.
5. Simular timeout e redirecionamento dos três endereços, garantindo tentativa controlada e mensagem correta.
6. Executar testes, verificação TypeScript, build, geração da casca e inspeção do APK/AAB antes da entrega.

## Resultado esperado

O APK/AAB deixa de depender do CORS e dos preflights da hospedagem para conversar com o servidor. O site permanece igual, o banco e os usuários não são modificados, e o Android passa a usar uma conexão HTTPS nativa restrita aos endereços autorizados do Visita SC.
