# Sincronização automática: 2x ao dia (manhã e tarde)

## Objetivo
Substituir a sincronização a cada 5 minutos por apenas duas execuções automáticas por dia — uma no período da manhã e outra no período da tarde. O botão manual "Sincronizar agora" continua disponível a qualquer momento.

## Regras propostas
- **Janela da manhã**: das 06:00 às 11:59 (horário do aparelho) — no máximo 1 execução automática.
- **Janela da tarde**: das 12:00 às 23:59 — no máximo 1 execução automática.
- **Como dispara**: os gatilhos já existentes (abrir o app, voltar a internet, voltar ao primeiro plano) continuam, mas agora só executam de fato se a janela atual ainda não tiver sincronizado naquele dia. Assim, quem abre o app de manhã sincroniza na abertura; quem abre só à noite faz a sincronização da tarde nesse momento.
- **Marcação diária**: a data da última execução de cada janela fica gravada no aparelho (espelho local), garantindo "no máximo 1x por janela por dia" mesmo se o app for aberto várias vezes.
- **Sincronização manual**: o botão "Sincronizar agora" no Perfil força a execução imediatamente, sem consumir ou bloquear a janela automática do período.
- **Fora das janelas** (00:00–05:59): nenhuma sincronização automática; apenas manual.
- Sem internet ou servidor fora: nada muda — o app continua funcionando com os dados locais.

## O que NÃO muda
- Banco de dados, regras de acesso (RLS), Bíblia offline, login/PIN/biometria — intocados.
- O envio de alterações feitas offline (fila) continua imediato ao reconectar, pois são dados do próprio usuário que precisam subir; o limite de 2x/dia vale apenas para o download automático.
- Painel de estado no Perfil continua mostrando última sincronização, pendências e erros.

## Detalhes técnicos
- `src/lib/local-auto-sync.ts`: remover o `setInterval` de 5 min; adicionar verificação de janela (`morning`/`afternoon`) com última data gravada via `local-db` (chave `auto_sync_windows`); `runAutoSync({ force: true })` ignora a janela (botão manual).
- Gatilhos `online`/`visibilitychange`/abertura passam a chamar `runAutoSync()` normal, que internamente decide se a janela permite.
- Atualizar o texto do cartão de sincronização no Perfil se necessário.
- Testes: cobrir limites de janela (05:59/06:00, 11:59/12:00), virada de dia, "1x por janela", e manual ignorando janela.
- Validação: typecheck, suíte de testes completa e build.
