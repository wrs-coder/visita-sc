# Modo Offline, Sincronização e Acesso sem Internet — versão premium

## Diagnóstico (confirmado no código)
- A cópia local das telas (agenda, visita, refeições, transporte, etc.) é guardada com validade de **24 horas** (`PERSIST_MAX_AGE`) e apagada da memória após 48h (`gcTime`). Passou desse tempo sem internet, o app joga fora a cópia ao abrir — por isso tudo sumiu.
- Os **esboços** sobreviveram porque ficam num banco local próprio, sem validade. As demais telas dependem só dessa cópia com prazo.
- O prazo vale mesmo quando a cópia nunca pôde ser renovada (sem rede), o que é o pior momento para descartar.

## O que será feito (sem mexer no servidor, banco, login, PIN ou biometria)
1. **Cópia local sem prazo de expiração no aparelho**: validade da cópia salva passa para 30 dias e a memória nunca descarta dados por tempo enquanto não houver dados novos para substituir. Dados só são trocados quando a internet trouxer versão mais nova.
2. **Nunca apagar dados por falha de rede**: se a renovação falhar, a tela continua mostrando a última cópia (hoje alguns cartões mostram vazio/erro).
3. **Selo "Atualizado há X"** discreto na barra de status offline, para a pessoa saber a idade dos dados.
4. **Download completo ao entrar com internet**: o pré-carregamento atual roda ao fazer login e também uma vez por dia em segundo plano (já existe; garantir que inclua todas as telas do menu e não só o painel).
5. **Telas do menu abrem sem internet**: confirmar que todas as páginas do menu lateral estão guardadas no aparelho (lista de telas pré-carregadas) e incluir as que faltarem.
6. **Teste automático** garantindo que a validade da cópia é de no mínimo 30 dias, para essa regressão não voltar.

## Fora deste lote (podemos fazer depois, se quiser)
- Tela "Dados disponíveis sem internet" no perfil, listando o que está salvo.
- Aviso antes de entrar no Modo Offline caso o último download tenha falhado.

## Detalhes técnicos
- `src/lib/query-persister.ts`: `PERSIST_MAX_AGE` = 30 dias; `PERSIST_BUSTER` mantido "v1" (não invalidar caches existentes).
- `src/router.tsx`: `gcTime` = `Infinity` (ou 30 dias) para que queries persistidas não sejam coletadas; `retry` mantido.
- Verificar consultas que usam `placeholderData`/`initialData` ausentes e onde `isError` substitui dados existentes por estado vazio; ajustar só a apresentação.
- `src/lib/offline-shells.ts` / `offline-prefetch.ts`: conferir lista de rotas e passos contra rotas `_app.*`; adicionar faltantes.
- `OfflineStatusBar.tsx`: exibir `getLastWarmupAt()` formatado.
- Teste em `src/lib/query-persister.test.ts`.
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`. Aplicativo instalado precisa de novo APK para receber a mudança.
