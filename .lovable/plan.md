# Controle de tempo do evento + ajustes nos Grandes Eventos

## (01) Controle de tempo do evento

**Como funciona**
- Tudo fica no aparelho (sem internet, sem servidor), igual ao cronômetro da visita.
- O botão **"Controle de tempo"** fica dentro de cada evento e abre uma tela cheia escura (modo foco). Não cria aba nova.
- A tela tem o formato do programa: cada parte com horário, tema, ancião e o **seu próprio temporizador**. Visual limpo, sem caixas pesadas.
- Toque em **qualquer parte** para iniciar o temporizador dela. A parte que estava rodando é encerrada e o tempo real fica gravado. Não precisa seguir a ordem nem apertar "Próximo".
- Cor da parte em andamento: **verde** → **âmbar** no último minuto → **vermelho** quando passa do tempo (aparece "+0:42").
- No topo: **"Programa +3 min atrasado"**, "adiantado" ou "no horário".
- Partes sem orador (Cântico, Música, Vídeo) também têm tempo, mas aparecem mais apagadas.
- **Série de discursos:** cada "•" tem seu próprio temporizador. O que cada orador passar ou adiantar é somado dentro do tempo do título da série, e o resultado da série entra no total do programa.
- Segurar uma parte já concluída permite **refazer** ou **corrigir** o tempo (se tocou errado).
- A lista rola sozinha para manter a parte atual visível. A tela fica acesa enquanto o controle estiver ligado.
- Se o app fechar ou o celular reiniciar, o controle continua de onde parou.

**Tela de foco (estilo programa)**
```text
┌──────────────────────────────┐
│ ✕   Controle de tempo        │
│     Programa +3 min atrasado │  ← âmbar
│──────────────────────────────│
│ 09:40  Cântico 7 e oração    │
│        ✓ 5:00 · 0:00         │  ← concluída, apagada
│ 09:45  Disc. 1 · Presidente  │
│        João Silva            │
│        ✓ 16:10 · +1:10       │  ← vermelho
│                              │
│ 10:15  Série: Imite aqueles  │
│        que confiaram em Jeová│
│        50:00 · +0:30 até agora│ ← soma dos "•"
│   • Disc. 2  Baraque         │
│     Pedro Souza              │
│     ▶ 08:24 restantes   ❚❚   │  ← EM ANDAMENTO, verde, maior
│   • Disc. 3  A sunamita      │
│     Lucas Lima      15:00    │  ← toque para iniciar
│                              │
│ 11:05  Cântico 57 e anúncios │
│        5:00                  │
└──────────────────────────────┘
```

**Fora do app ("Sobrepor a outros apps")**
- Ao sair do app, aparece uma bolinha flutuante por cima de outros apps:
```text
   ┌─────────────────┐
   │ ● 08:24  +3 min │  ← arrastável; toque = volta ao app
   │ Disc. 2 Baraque │
   └─────────────────┘
```
- Na primeira vez, o app explica e abre a configuração do Android para você permitir "Sobrepor a outros apps".
- Se a permissão não for dada, o cronômetro aparece numa notificação fixa na barra do Android.

**Relatório final**
```text
┌──────────────────────────────┐
│ ‹  Relatório de tempo        │
│ Programa terminou +4 min     │
│──────────────────────────────│
│ Parte       Prev.  Real  Dif.│
│ Disc. 1     15:00 16:10 +1:10│ vermelho
│ Série       50:00 50:30 +0:30│
│  • Disc. 2  15:00 15:50 +0:50│
│  • Disc. 3  15:00 14:40 -0:20│ verde
│ Cântico 57   5:00  5:00  0:00│
│──────────────────────────────│
│ Por ancião                   │
│ João Silva            +1:10  │
│ Lucas Lima            -0:20  │
│                              │
│ [ Exportar PDF ]             │
└──────────────────────────────┘
```
- PDF elegante no mesmo padrão do Programa do evento. O relatório fica guardado no aparelho e pode ser reaberto pelo evento.

## (02) Ajustes nos eventos

- **"Informações adicionais (vão em todos os convites)"**: concordo, é repetido com a carta convite. Sai da tela. Se um evento antigo já tiver esse texto, ele aparece só nesse caso, com botão "Apagar", para nada sumir sem você ver.
- **Presidente do programa e Oração**: o quadro "Participações na parte" (Vídeo, Entrevista, Demonstração…) deixa de aparecer. O campo "Outras informações só para este ancião" continua.

```text
Oração · Cântico 7 e oração
┌──────────────────────────────┐
│ Ancião ____________________  │
│ Congregação _______________  │
│ ▾ Informações só deste convite│
│   Outras informações...      │  ← sem as caixinhas
└──────────────────────────────┘
```

## Detalhes técnicos
- Nada muda no banco de dados. Estado em localStorage por evento (`bigEventTimer.<eventId>`: parte ativa, início/fim real de cada parte, pausas), calculado por Date.now para sobreviver a fechar/reabrir.
- Lógica pura em `src/lib/big-events/event-timer.ts`: previsto × real, desvio por parte e por ancião, soma dos "•" no tempo do título da série (que entra no total), atraso acumulado. Testes vitest.
- Tela `EventTimerFocus.tsx` em tela cheia com `focus-chrome` e `useImmersiveWhile`; tokens existentes (success/warning/destructive), sem hex.
- Sobreposição: pequeno plugin Capacitor nativo (serviço com `TYPE_APPLICATION_OVERLAY`), permissões `SYSTEM_ALERT_WINDOW` e `FOREGROUND_SERVICE`; o serviço recebe o horário-alvo e conta sozinho. Sem permissão → notificação fixa com cronômetro. No navegador, só a tela de foco.
- PDF via `pdf-lib` (`timer-report-pdf.ts`), fontes já embarcadas.
- (02) Em `BigEvents.tsx`: ocultar `extra_info` quando vazio; esconder `PART_EXTRAS` em presidência (`IS_CHAIR`) e oração (regras de `program-rules.ts`).
- A bolinha flutuante exige gerar novo APK/AAB para funcionar no celular; sem aumento de versão durante o desenvolvimento.
