# Fazer o aplicativo conectar por visitasc.com.br

## Resposta curta

Sim, é possível. Acabei de testar os três endereços agora: **visitasc.com.br, www.visitasc.com.br e visita-sc.lovable.app respondem corretamente** ao teste de conexão do aplicativo (resposta 204, com a autorização de acesso correta e sem redirecionamento). Ou seja, o servidor está liberado para os três — o problema está no próprio aplicativo, no jeito como ele faz o "teste de conexão" antes de qualquer login.

## Causa provável

A versão nova faz, antes de tudo, um teste de conexão especial que pede ao navegador interno do Android para **não seguir redirecionamentos**. Esse modo foi necessário quando visitasc.com.br era o endereço principal e os outros redirecionavam. Em muitas versões do navegador interno do Android esse modo simplesmente falha, mesmo com internet perfeita.

Quando esse teste falha, o aplicativo hoje **desiste antes de tentar de verdade** e mostra "Não foi possível conectar ao servidor" — exatamente o sintoma relatado. A versão antiga não tinha esse teste, por isso continua funcionando.

## O que vai ser feito

1. **Teste de conexão compatível com todos os aparelhos**: remover o modo que trava no Android e passar a confirmar a conexão pela resposta em si (e detectar redirecionamento pelo endereço final da resposta, não por um modo especial).
2. **Nunca desistir antes de tentar**: se o teste não conseguir decidir um endereço, o aplicativo passa a tentar de verdade cada um dos três endereços, em ordem (visitasc.com.br, www.visitasc.com.br, visita-sc.lovable.app), antes de mostrar qualquer aviso.
3. **Aviso só quando é real**: a mensagem de falha só aparece depois que os três endereços realmente falharem.
4. **Tela de diagnóstico no aparelho**: o aviso de conexão ganha um detalhe expansível mostrando o resultado de cada endereço (respondeu / demorou / erro). Assim, se algo voltar a falhar, dá para ver a causa direto no celular, sem adivinhação.
5. **Nova versão 4.1.6** (número interno 9) para gerar APK/AAB.

## Detalhes técnicos

- `src/lib/api-origin.ts`: `probe()` deixa de usar `redirect: "manual"`; aceita 204 e rejeita quando `response.redirected` aponta para outro host; passa a expor o resultado por origem (`probeAllOrigins`) para o diagnóstico.
- `src/start.ts` (`apiFetch`): quando `resolveBestApiOrigin()` retorna `null`, em vez de lançar erro imediato, percorre `API_ORIGINS` na ordem com a requisição real; o erro só é lançado após todas falharem.
- `src/components/AppOriginDiagnostics.tsx`: painel com resultado por endereço e botão "tentar novamente".
- `src/lib/api-origin.test.ts`: casos para redirecionamento detectado pelo endereço final e para o fallback sem origem resolvida.
- `package.json` e `android/app/build.gradle`: 4.1.6 / versionCode 9.

Sem alterações no banco de dados, na autenticação, no modo offline, nos esboços ou no cronômetro.
