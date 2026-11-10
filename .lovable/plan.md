# Controle de tempo do evento + ajustes nos Grandes Eventos

## (01) Controle de tempo do evento

**Como funciona**
- Tudo fica no aparelho (sem internet, sem servidor), igual ao cronômetro da visita.
- Botão **"Controle de tempo"** dentro de cada evento abre uma tela cheia escura (modo foco). Não cria aba nova.
- A tela mostra só o essencial: parte atual, ancião, contagem regressiva grande e a próxima parte.
- Cor da contagem: **verde** → **âmbar** no último minuto → **vermelho** quando passa do tempo (aparece "+0:42").
- No topo: **"Programa +3 min atrasado"** / "adiantado" / "no horário".
- Partes sem orador (Cântico, Música, Vídeo) também têm tempo, mas aparecem mais apagadas.
- Os "•" da Série de discursos contam dentro do tempo do título da série, sem empurrar o programa (mesma regra de hoje).
- Se o app fechar ou o celular reiniciar, o controle continua de onde parou (os horários ficam guardados no aparelho).
- A tela fica acesa enquanto o controle estiver ligado.

**Tela de foco**
```text
┌──────────────────────────────┐
│ ✕            Programa +3 min │  ← âmbar se atrasado
│              atrasado        │
│                              │
│  10:15 · Discurso 4          │
│  Como imitar a fé de Baraque │
│  João Silva                  │
│                              │
│          08:24               │  ← verde / âmbar / vermelho
│     ━━━━━━━━━━━━━━━━━──────  │
│                              │
│  Próxima                     │
│  10:30 · A mulher sunamita   │
│  Pedro Souza                 │
│                              │
│   ┌──────┐  ┌────────────┐   │
│   │  ❚❚  │  │ Próxima ▸  │   │
│   └──────┘  └────────────┘   │
│        Ver programa ⌄        │
└──────────────────────────────┘
```
- **Próxima ▸** encerra a parte atual e inicia a seguinte (grava o tempo real).
- **❚❚** pausa (por exemplo, problema de som). **Ver programa** abre uma lista simples para pular ou voltar uma parte.

**Fora do app ("Sobrepor a outros apps")**
- Ao sair do app, aparece uma bolinha flutuante por cima de outros apps:
```text
   ┌─────────────────┐
   │ ● 08:24  +3 min │  ← arrastável; toque = volta ao app
   │   Próxima ▸     │
   └─────────────────┘
```
- Na primeira vez, o app explica e abre a configuração do Android para você permitir "Sobrepor a outros apps".
- Se a permissão não for dada, o controle aparece numa notificação fixa com o cronômetro e o botão "Próxima" (funciona igual, só que na barra de notificações).

**Relatório final**
```text
┌──────────────────────────────┐
│ ‹  Relatório de tempo        │
│ Programa terminou +4 min     │
│──────────────────────────────│
│ Parte       Prev.  Real  Dif.│
│ Disc. 2     15:00 16:10 +1:10│ vermelho
│ Disc. 3     10:00  9:20 -0:40│ verde
│ Cântico 57   5:00  5:00  0:00│
│──────────────────────────────│
│ Por ancião                   │
│ João Silva            +1:10  │
│ Pedro Souza           -0:40  │
│                              │
│ [ Exportar PDF ]             │
└──────────────────────────────┘
```
- PDF elegante no mesmo padrão do Programa do evento. O relatório fica guardado no aparelho e pode ser reaberto pelo evento.

## (02) Ajustes nos eventos

- **"Informações adicionais (vão em todos os convites)"**: concordo, é repetido com a carta convite. Sai da tela. Se algum evento antigo já tiver esse texto, ele continua indo nos convites já existentes até você apagar (aparece só nesse caso, com botão "Apagar"), para nada sumir sem você ver.
- **Presidente do programa e Oração**: o quadro "Participações na parte" (Vídeo, Entrevista, Demonstração…) deixa de aparecer. O campo "Outras informações só para este ancião" continua.

```text
Oração · Cântico 7 e oração
┌──────────────────────────────┐
│ Ancião ____________________  │
│ Congregação _______________  │
│ ▸ Informações só deste convite│
│   Outras informações...      │  ← sem as caixinhas
└──────────────────────────────┘
```

## Detalhes técnicos
- Nada muda no banco de dados. Estado do controle em localStorage por evento (`bigEventTimer.<eventId>`: índice, início de cada parte, pausas, tempos reais), calculado por relógio real (Date.now), não por intervalos, para sobreviver a fechar/reabrir.
- Lógica pura em `src/lib/big-events/event-timer.ts` (planejado × real, atraso acumulado, desvio por ancião, regra dos "•" da série) com testes vitest.
- Tela: `EventTimerFocus.tsx` em tela cheia usando `focus-chrome` e `useImmersiveWhile`; tokens de cor existentes (success/warning/destructive), sem hex.
- Sobreposição: plugin Capacitor nativo pequeno (`FloatingTimerPlugin` + `Service` com `TYPE_APPLICATION_OVERLAY`), permissão `SYSTEM_ALERT_WINDOW` e `FOREGROUND_SERVICE` no AndroidManifest; o serviço recebe horário-alvo e conta sozinho; botão "Próxima" envia evento de volta ao app. Sem permissão → notificação fixa (foreground service com cronômetro). No navegador, só a tela de foco.
- PDF via `pdf-lib` (`timer-report-pdf.ts`), fontes já embarcadas.
- (02): em `BigEvents.tsx`, ocultar o campo `extra_info` quando vazio; esconder `PART_EXTRAS` quando a parte for presidência (`IS_CHAIR`) ou oração (regra de `program-rules.ts`).
- Exige gerar novo APK/AAB para a parte "Sobrepor a outros apps" funcionar no celular; sem aumento de versão durante o desenvolvimento.
