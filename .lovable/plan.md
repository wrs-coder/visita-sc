# Corrigir definitivamente o login do APK/AAB gerado no Windows

## Causa real confirmada

A falha começou na mudança de arquitetura de **11 de setembro**, não na versão 4.2.0 nem no PIN/biometria.

- Até a versão 4.0.0, o aplicativo abria o site publicado diretamente. O navegador e o servidor recebiam o mesmo pacote gerado na publicação, então os endereços internos das funções sempre coincidiam.
- Em 11 de setembro, o commit `a52efe0` removeu o endereço remoto fixo e passou a gerar a interface localmente no computador para incluí-la no APK/AAB.
- O framework gera o endereço de cada função do servidor aplicando SHA-256 sobre `caminho do arquivo + nome da função`.
- Esse caminho usa `/` no servidor Linux, mas pode usar `\` no Windows. Assim, o APK compilado no Windows grava um identificador diferente daquele existente no servidor publicado.
- Para a primeira função do login, o servidor publicado usa `f5e176a0…`, enquanto a forma equivalente com separadores do Windows gera `1c4b589e…`.
- O teste real confirmou o comportamento: a chamada com o identificador publicado retorna **200** nos três domínios; um identificador incompatível retorna **500** com a página “This page didn't load”. O login atual converte esse erro em “Não foi possível conectar ao servidor”.
- Isso explica todos os sintomas ao mesmo tempo: o site funciona, o APK 4.0.0 funciona, `/api/public/ping` funciona, trocar domínios/CORS não resolve, e o defeito aparece somente nos APKs produzidos pela nova casca local no Windows.
- Não existe bloqueio do banco aos domínios personalizados. `visitasc.com.br`, `www.visitasc.com.br` e `visita-sc.lovable.app` aceitam hoje o preflight e a função correta a partir de `https://localhost`.

## Implementação

### 1. Tornar os identificadores independentes do sistema operacional

- Configurar a geração dos identificadores das funções no build para normalizar todo caminho para `/` antes do SHA-256.
- Reproduzir exatamente o formato padrão já usado pela publicação Linux, preservando os identificadores atuais do servidor e evitando quebra nas versões web.
- Aplicar isso de forma central na configuração do framework, cobrindo todas as funções — login, sincronização, relatórios, mensagens e demais áreas — em vez de corrigir apenas uma chamada.

### 2. Impedir nova regressão no empacotamento Android

- Criar teste que simule caminhos Windows e Linux e exija o mesmo identificador nos dois casos.
- Fazer o processo de geração do APK/AAB validar que o identificador de `resolveLoginIdentifier` presente na casca coincide com o identificador esperado da publicação.
- Interromper a geração do pacote com mensagem clara se houver incompatibilidade, em vez de produzir um APK que só falha no celular.

### 3. Melhorar o diagnóstico sem mudar o login

- Separar no formulário as falhas da resolução do usuário, da autenticação da senha e da leitura da função do usuário.
- Tratar resposta HTTP 500/HTML da função como “aplicativo incompatível com a versão publicada”, não como falta de internet.
- Não registrar usuário, senha, e-mail, token ou qualquer dado pessoal.

### 4. Preservar o sistema existente

- Manter `visitasc.com.br` como origem preferencial e os outros dois endereços como contingência.
- Não alterar banco, políticas de acesso, contas existentes, senhas, esboços, textos bíblicos, cache offline, PIN ou biometria.
- Não criar uma nova API de login: corrigir o identificador na origem elimina a causa sem duplicar lógica sensível.

## Validação obrigatória

- Confirmar por teste que caminhos Windows e Linux geram o mesmo hash publicado.
- Gerar a casca Android e conferir o identificador dentro dos arquivos efetivamente copiados para o aplicativo.
- Executar `OPTIONS` e `POST` reais da primeira etapa do login, com origem `https://localhost`, nos três domínios.
- Testar no pacote Android: usuário inexistente, senha incorreta e login válido; depois testar queda do domínio principal e uso da contingência.
- Executar testes, verificação TypeScript e build antes de elevar `versionCode` e gerar novo APK/AAB.

## Resultado esperado

O APK/AAB compilado no Windows chamará exatamente as mesmas funções existentes na publicação. O login continuará usando o fluxo online atual, poderá operar por `visitasc.com.br`, e deixará de acusar falsamente falta de conexão sem qualquer alteração nos usuários ou no banco de dados.
