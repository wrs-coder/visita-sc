# Fazer o aviso de atualização aparecer de forma confiável

## O que foi conferido
- O site publicado (visitasc.com.br) já informa a versão 4.2.14 corretamente.
- O problema está dentro do aplicativo instalado.

## Causas encontradas
1. **Espera de 6 horas:** o app só consulta uma vez a cada 6 horas. Se ele consultou antes da publicação (quando o site ainda dizia 4.2.11), não volta a perguntar até passar esse tempo — mesmo fechando e abrindo.
2. **Versão interna desatualizada:** o app compara usando um número fixo "4.2.11" que não foi atualizado nas versões 4.2.12, 4.2.13 e 4.2.14. Isso faria até quem já tem a 4.2.14 receber o aviso por engano.
3. **Aviso só existe a partir da 4.2.11:** aparelhos com versões anteriores nunca mostram o aviso.

## Correção
- O app passa a ler a versão real instalada direto do Android (sem número fixo no código), com o número fixo apenas como reserva.
- A espera de 6 horas só começa a contar depois de uma consulta que **encontrou** novidade e o usuário tocou em "Agora não". Sem novidade, o app volta a consultar a cada abertura (máx. 1x por 30 min).
- Teste automático para a comparação de versões.

## Importante
- Quem já está na 4.2.14 não deve ver aviso (correto).
- A correção só vale para os aparelhos depois de uma próxima versão (4.2.15) instalada. Para quem está em 4.2.11–4.2.13 hoje, o aviso deve aparecer quando passarem as 6 horas desde a última consulta.

## Técnico
- `src/lib/app-update-check.ts`: `getInstalledVersion()` via `@capacitor/app` `App.getInfo().version` (import dinâmico, fallback `APP_VERSION`); intervalo mínimo 30 min; chave de 6h removida em favor do "dispensado hoje".
- Atualizar teste em `app-update-check.test.ts`.
- Versão 4.2.15 / versionCode 25 (package.json, build.gradle, LoginForm).
