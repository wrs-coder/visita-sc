# Boia do controle de tempo por cima de outros aplicativos

## O que acontece hoje
- A boia da reunião é desenhada dentro da tela do Visita SC. Quando você troca de aplicativo, ela some junto.
- O app já tem uma boia de verdade do Android ("Sobrepor a outros apps"), mas só os Grandes Eventos usam. Ela mostra só o tempo, sem botões.

## O que vai mudar
Ao sair do Visita SC com o cronômetro da reunião ligado, a boia continua na tela, por cima de qualquer aplicativo (JW Library, WhatsApp, etc.). Dá para arrastar a boia, e os botões funcionam sem voltar ao app.

```text
 ┌───────────────────────────┐
 │ JW Library        12:41   │
 │                           │
 │  ╭─────────────────────╮  │
 │  │ 04:32  Tesouros     │  │  verde / amarelo (último minuto)
 │  │  ⏮    ⏸    ⏭    ⤢  │  │  vermelho com "+" se passar
 │  ╰─────────────────────╯  │
 │   (arraste para mover)    │
 │                           │
 │   ...texto do app...      │
 └───────────────────────────┘
  ⏮ parte anterior · ⏸/▶ pausa/inicia · ⏭ próxima
  ⤢ abre o Visita SC no controle de tempo
```

Tamanhos: segue a escolha já feita na boia (Compacta / Normal / Grande).
Compacta mostra só o tempo; tocar nela abre o app.

### Primeira vez
```text
 ┌───────────────────────────┐
 │  Boia sobre outros apps   │
 │  Para o tempo ficar na    │
 │  tela fora do Visita SC,  │
 │  permita "Sobrepor a      │
 │  outros apps".            │
 │   [ Agora não ] [Permitir]│
 └───────────────────────────┘
```
Sem permissão, aparece uma notificação fixa com a parte atual e "Termina às 19:42" (como já acontece nos Grandes Eventos).

### Ao voltar ao app
A boia do Android some e a boia de dentro do app reaparece exatamente no mesmo ponto, com pausas e trocas de parte feitas lá fora já aplicadas.

## O que não muda
- Controle de tempo, partes da apostila e Grandes Eventos continuam iguais.
- No navegador (sem ser o app instalado) nada muda: lá não existe boia sobre outros apps.
- Precisa gerar um novo APK (versão 6.0.1) — a mudança é na parte Android do app.

## Detalhes técnicos
- FloatingTimerService/Plugin: novo modo "meeting" com lista de partes (título + ms planejados), índice atual, startedAt/spentMs por parte e tamanho; botões ⏮ ⏸ ⏭ ⤢ alteram o estado no próprio serviço (o WebView pode estar pausado em segundo plano) e guardam em SharedPreferences.
- Novo método `getState()` + evento `meetingTimerChanged`; ao voltar (App `resume`) o JS lê o estado e grava no armazenamento local do cronômetro, depois chama `hide()`.
- MeetingFloatingTimer: ao ir para segundo plano com cronômetro ativo chama `show` (modo meeting); pede permissão uma vez (flag no aparelho). Modo Grandes Eventos atual fica intacto (modo padrão).
- floating-timer.ts ganha `showMeetingFloating`/`readMeetingFloating`, com a mesma queda para notificação.
- Testes: conversão estado nativo → estado do cronômetro (pausa, próxima, anterior, tempo passado). Versão 6.0.1 / versionCode 49; registrar a decisão em AGENTS.md.
- Não verificável aqui: comportamento real no celular — conferir após instalar o APK.
