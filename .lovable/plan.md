# Capacitor 8.5.2 + avisos do cronômetro (1 minuto, tempo terminado e tempo excedido)

## 1. Atualizar o Capacitor para 8.5.2 (fecha a falha GHSA-rvm3-566m-v7fv)
- Fixar `@capacitor/core` e `@capacitor/android` em `8.5.2`, os dois na mesma versão. Assim o aviso "version doesn't match" não volta.
- Os outros plugins continuam como estão, porque são compatíveis.
- O site não muda nada. Quem já tem o app instalado não perde nenhum dado.
- No VS Code, rode depois `npm install` e `npx cap sync android`. Em seguida, gere o APK/AAB.

## 2. Avisos valem para os dois modos do cronômetro
Os avisos passam a contar a partir do **tempo escolhido**, e não do 00:00. Isso vale tanto na contagem regressiva quanto na progressiva:
- **Falta 1 minuto:** na regressiva, quando faltar 01:00. Na progressiva, quando faltar 1 minuto para o tempo escolhido (por exemplo, aos 29:00 de um tempo de 30 minutos).
- **O tempo terminou:** quando o tempo escolhido é atingido. Aparece em destaque vermelho, com vibração (quando o aparelho permite) e um botão "OK".
- **Tempo excedido:** "Você passou 1 minuto", "Você passou 2 minutos" e assim por diante até "Você passou 5 minutos", um aviso por minuto.
- Na regressiva, depois do 00:00 o cronômetro mostra `+01:23` em vermelho. Na progressiva, ele continua subindo (31:23) e fica em vermelho.
- Ao completar 5 minutos excedidos, os avisos param. A regressiva para sozinha. A progressiva continua contando, como já acontece hoje.

## 3. Avisos em todas as telas do esboço
Os avisos aparecem no **modo esboço** e no **modo tela cheia**, tanto na aba Esboços quanto no Dashboard. Cada aviso aparece só uma vez por esboço, mesmo com o cronômetro aberto em mais de um lugar.

Os textos ficam em português, inglês e espanhol.

## O que não muda
Banco de dados, login, Bíblia, anexos, sincronização, os botões do cronômetro e a tela acesa enquanto ele roda.

## Detalhes técnicos
- `use-outline-timer.ts`: no modo countdown, `computeTickAdvance` deve seguir até `targetSec + 300` e só então definir `isRunning=false`. O countup continua sem parar. Expor `overtimeSec = max(0, elapsed - target)`, que fica igual nos dois modos porque `elapsedSec` já é comum aos dois. O `start()` reinicia a contagem se ela já chegou ao limite.
- Marcos calculados sobre `elapsedSec - targetSec`: `-60`, `0`, `+60` até `+300`. Para não repetir avisos entre instâncias nem depois de recarregar a página, guardar os marcos já exibidos em localStorage por `outlineId` e ciclo, e limpar no reset, no setTarget e na troca de modo. Se o tempo saltar (página recarregada, aba em segundo plano), mostrar só o último marco atingido.
- Um único observador de alertas, montado nos dois modos (esboço e tela cheia) da aba Esboços e do Dashboard. Remover a trava `variant !== "toolbar"` do `OutlineTimer.tsx`. Exibir o aviso em uma camada própria (portal) para que ele fique visível também na tela cheia.
- Testes: ajustar o teste "countdown pausa automaticamente" para o novo limite de +5 minutos e testar os marcos nos dois modos e a deduplicação.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
