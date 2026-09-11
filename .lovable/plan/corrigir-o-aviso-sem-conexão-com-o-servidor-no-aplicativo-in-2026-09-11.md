# Corrigir o aviso "Sem conexão com o servidor" no aplicativo instalado

## O que está acontecendo (confirmado nos testes de agora)

O aplicativo testa se há servidor disponível baixando o arquivo do site `manifest.webmanifest`. Testei os três endereços simulando exatamente a chamada que o aplicativo faz:

- Os três respondem normalmente (200), **mas nenhum autoriza o aplicativo a ler esse arquivo**. Ele é um arquivo estático entregue direto pela hospedagem e não passa pela autorização de acesso do servidor.
- Resultado: o teste falha sempre, nos três endereços, com Wi‑Fi ou 4G — e o aviso "Sem conexão com o servidor" aparece mesmo com internet perfeita.
- Já as chamadas de dados de verdade **estão autorizadas corretamente** nos três endereços (verifiquei um a um e todos responderam liberando o aplicativo). Ou seja: o app provavelmente está funcionando; só o teste de conexão está errado.

Sobre o `visita-sc.lovable.app`: daqui ele responde normalmente e o projeto está publicado, com os dois domínios próprios ativos. A falha que você vê nesse endereço específico é do caminho de rede do seu aparelho/operadora, não do aplicativo. Por isso ele deve continuar existindo apenas como última alternativa, nunca como o teste que decide se há conexão.

## Solução definitiva

1. **Criar um endereço próprio de "está no ar?"** no servidor (`/api/public/ping`), que responde uma resposta mínima e autoriza explicitamente a chamada vinda do aplicativo. É o mesmo mecanismo que já funciona nas chamadas de dados.
2. **O aplicativo passa a testar esse endereço** em vez do arquivo do site. Assim o teste reflete a realidade.
3. **Tornar o teste tolerante**: qualquer resposta do servidor (mesmo de erro) já conta como "conectado"; só a falha total de rede conta como offline. E o tempo de espera sobe de 4 para 8 segundos, porque no 4G a primeira chamada costuma demorar mais.
4. **Ordem e memória dos endereços**: mantém a preferência pelo último que funcionou, testa os três em paralelo e fica com o primeiro que responder — em vez de esperar um por um. O `lovable.app` continua por último.
5. **Aviso mais honesto**: o banner só aparece depois de duas falhas seguidas (com nova tentativa automática), e some sozinho assim que a conexão voltar.
6. **Versão** para 4.1.3 (código 6) para gerar o novo pacote.

Nada muda no banco de dados, no login, na sincronização, nos esboços, no cronômetro ou no site no navegador.

## Detalhes técnicos

- Nova rota `src/routes/api/public/ping.ts` (`createFileRoute` com handlers `GET` e `OPTIONS`) devolvendo `204` com os cabeçalhos de `src/lib/cors.ts` (`isAllowedOrigin` + `corsHeaders`), incluindo `Vary: Origin`. Sem dados, sem autenticação.
- `src/lib/api-origin.ts`: `PROBE_PATH` passa a `/api/public/ping`; `PROBE_TIMEOUT_MS` para 8000; `probe()` retorna `true` para qualquer resposta HTTP recebida (`res.status < 500` ou simplesmente resposta obtida), `false` apenas em exceção/abort; `resolveBestApiOrigin()` dispara as sondas em paralelo com `Promise.any`, respeitando a ordem de preferência para desempate, e memoriza a vencedora em `localStorage`.
- `src/components/AppOriginDiagnostics.tsx`: exige duas falhas consecutivas antes de exibir o banner, com re-tentativa automática após ~10s e limpeza no evento `online`.
- `package.json` → `4.1.3`; `android/app/build.gradle` → `versionCode 6`, `versionName "4.1.3"`.
- Verificação antes de fechar: `curl -H 'Origin: https://localhost'` no novo endereço nos três domínios (esperado `204` + `access-control-allow-origin`) e `bunx tsc --noEmit`.
