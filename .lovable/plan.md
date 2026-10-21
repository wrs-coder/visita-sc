# Capacitor 8.5.2 + avisos do cronômetro (1 minuto, tempo terminado e tempo excedido)

## 1. Atualizar Capacitor para 8.5.2 (fecha a falha GHSA-rvm3-566m-v7fv)
- Fixar `@capacitor/core` e `@capacitor/android` em `8.5.2` (sem `^`) no package.json, os dois na mesma versão, para que o aviso "version doesn't match" não volte.
- Os demais plugins (filesystem, share, browser e os outros) continuam como estão, porque já são compatíveis com a 8.x.
- O site não muda nada, porque usa só o core. Quem já tem o app instalado mantém os dados.
- No VS Code, você vai rodar depois: `npm install` e `npx cap sync android`. Depois gera o APK/AAB.

## 2. Corrigir o aviso "falta 1 minuto"
- Hoje esse aviso só aparece na barra do modo edição. Ele vai passar a aparecer também na tela cheia do esboço e na tela cheia do Dashboard.
- Cada aviso aparece uma única vez por esboço, mesmo com o cronômetro aberto em vários lugares ao mesmo tempo, para não repetir o mesmo aviso.

## 3. Novo aviso "O tempo terminou"
- Quando a contagem regressiva chega a 00:00, aparece um aviso em destaque vermelho, com vibração (onde o aparelho permitir) e um botão "OK".

## 4. Avisos de tempo excedido, de 1 a 5 minutos
- Ao chegar a 00:00, o cronômetro não para mais. Ele passa a contar o tempo excedido e mostra `+01:23` em vermelho.
- Aparece um aviso a cada minuto: "Você passou 1 minuto", "Você passou 2 minutos" e assim por diante até "Você passou 5 minutos".
- Ao completar 5 minutos excedidos, o cronômetro para sozinho. Pausar, zerar ou trocar o tempo continuam funcionando normalmente.
- Os textos ficam em português, inglês e espanhol.

## O que não muda
Banco de dados, login, Bíblia, anexos, sincronização, os modos de contagem e a tela acesa enquanto o cronômetro roda.

## Detalhes técnicos
- `use-outline-timer.ts`: no modo countdown, `computeTickAdvance` passa a seguir até `targetSec + 300` e só então define `isRunning=false`. Expor `overtimeSec = max(0, elapsed - target)`. O `start()` reinicia a contagem quando ela já chegou ao limite.
- Alertas disparados por marco (`-60`, `0`, `+60` até `+300`) e deduplicados por `outlineId` e marco, com uma chave em localStorage para cada ciclo. Essas chaves são limpas no reset, no setTarget e no start a partir do zero. Assim os alertas não duplicam entre instâncias nem quando o tempo salta depois de recarregar a página (nesse caso, só o último marco atingido é mostrado).
- `OutlineTimer.tsx`: remover a trava `variant !== "toolbar"`. Os alertas passam a ser controlados por um único observador.
- Testes: atualizar o teste "countdown pausa automaticamente" para o novo limite de +5 minutos e adicionar testes dos marcos de 1 a 5 minutos e da deduplicação.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
