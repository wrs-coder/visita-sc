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

---

## (03) Reorganizar o topo de cada evento (Grandes Eventos)

Hoje tudo fica empilhado: nome, data, local, horário, confirmação, carta, botões, contadores e filtros repetidos. Proposta no estilo Ajustes do iPhone / One UI:

```text
ANTES                              DEPOIS
┌─────────────────────────┐        ┌─────────────────────────┐
│ v Feliz É Aquele...  0/0│        │ v Feliz É Aquele...  0/0│
│ [Nome do evento      ✎] │        │   sáb 05/12 · SAV · 09:40│
│ [05/12/2026] [SAV     ] │        │                         │
│ Início [09:40] Recalc.. │        │ ┌──────────┐┌─────────┐ │
│ Como confirmam          │        │ │⏱ Controle││⬇ Export.│ │
│ (PIN)(Link pessoal)     │        │ │ de tempo ││         │ │
│ Modelo [Assembleia   v] │        │ └──────────┘└─────────┘ │
│ [Exportar][Controle] ...│        │                         │
│ (0)(0)(0)(0)            │        │ ┌ Detalhes do evento  > ┐│
│ Todas|Pend|S.tempo|S.an │        │ └ nome, data, carta...  ┘│
└─────────────────────────┘        │                         │
                                   │ (0 Conf)(0 Pend)(0 Rec) │
                                   │ (0 Sem ancião)          │
                                   │ ⚠ 2 partes sem tempo    │
                                   │ ─── lista das partes ── │
                                   └─────────────────────────┘

Ao tocar em "Detalhes do evento" abre (lista agrupada):
┌─────────────────────────────────┐
│ Nome        Feliz É Aquele... ✎ │
│ Data                 05/12/2026 │
│ Local                       SAV │
│ Início do programa        09:40 │
│        ↻ Recalcular horários    │
├─────────────────────────────────┤
│ Confirmação  (PIN)(Link pessoal)│
│ Modelo de carta   Assembleia  > │
└─────────────────────────────────┘
```

- Botões principais grandes lado a lado: **Controle de tempo** e **Exportar**. "Lembrar pendentes" fica no menu "…" (já está lá).
- Configurações do evento ficam guardadas em "Detalhes do evento", recolhido por padrão (abre sozinho em evento novo).
- Os 4 contadores viram o próprio filtro: tocar em "Pendentes" mostra só pendentes; tocar de novo volta a "Todas". A barra de filtros repetida sai.
- "Sem tempo" vira um aviso âmbar tocável, só quando houver partes sem tempo.
- Nada muda nos dados; só a arrumação. Arquivo: `src/components/circuit/BigEvents.tsx`.
