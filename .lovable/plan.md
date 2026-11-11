# Controle de tempo: relógio igual ao combinado e menos informação repetida

## (01) Relógio grande à direita de cada parte

Hoje o relógio mostra um ícone quando a parte ainda não começou, e embaixo troca o texto ("tocar p/ parar", "concluída", "pausado"). Vai voltar ao modelo combinado na sua imagem:

```text
┌──────────────────────────────────────┐
│ 4. Baraque (16 min)        ┌───────┐ │
│ 🗓 10:15  ▶ 10:17  🔔 +2 min │ 16:00 │ │
│ João Silva · Central       │(16min)│ │
│                            └───────┘ │
│                                 ···  │
└──────────────────────────────────────┘
```

- Números grandes sempre visíveis, estilo relógio digital (também antes de começar: 16:00 no Regressivo, 00:00 no Cronômetro).
- Embaixo, sempre o tempo previsto entre parênteses: "(16min)". Sem textos trocando.
- Cores continuam: verde no tempo, âmbar no último minuto, vermelho quando passa. Antes de começar fica neutro.
- Pausado continua indicado pelo relógio piscando.
- Um toque inicia/para e dois toques perguntam se deseja zerar (sem mudança).

## (02) Remover "Duração −14:04"

Ele mostrava quanto a parte concluída ficou acima ou abaixo do previsto. Isso já aparece no próprio relógio (em vermelho/verde) e no relatório, então sai da linha. A linha fica só com: horário do programa, hora em que começou e a pílula do sino.

## Detalhes técnicos
- Arquivo: `src/components/circuit/EventTimerFocus.tsx` (botão do relógio e linha de horários). Nada muda em dados, relatório ou PDF.
