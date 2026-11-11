# Controle de tempo e Grandes Eventos: telas mais limpas

## (01) Relógio grande à direita de cada parte (Controle de tempo)

Volta ao modelo combinado na sua imagem:

```text
┌──────────────────────────────────────┐
│ 4. Baraque (16 min)        ┌───────┐ │
│ 🗓 10:15  ▶ 10:17  🔔 +2 min │ 16:00 │ │
│ João Silva · Central       │(16min)│ │
│                            └───────┘ │
└──────────────────────────────────────┘
```

- Números grandes sempre visíveis, estilo relógio digital (antes de começar: 16:00 no Regressivo, 00:00 no Cronômetro).
- Embaixo, sempre o previsto entre parênteses: "(16min)". Sem textos trocando.
- Cores: verde no tempo, âmbar no último minuto, vermelho quando passa; neutro antes de começar. Pausado = relógio piscando.
- Um toque inicia/para; dois toques perguntam se deseja zerar (sem mudança).

## (02) Remover "Duração −14:04"

Mostrava quanto a parte concluída ficou acima/abaixo do previsto. Isso já aparece no relógio e no relatório, então sai.

## (03) Topo de cada evento (Grandes Eventos)

```text
┌─────────────────────────────────┐
│ v Feliz É Aquele Que Conf... 0/0│
│   sáb 05/12 · SAV · 09:40       │
│                                 │
│ ┌─────────────────────────┐ ··· │
│ │ ⏱  Controle de tempo    │     │
│ └─────────────────────────┘     │
│ Detalhes do evento            > │  (recolhido)
│ Resumo  0 ✓  0 ⏳  0 ✕  0 👤   > │  (recolhido)
│ ⚠ 2 partes sem tempo            │
│ ─────── lista das partes ────── │
└─────────────────────────────────┘
Menu "···": Nova parte · Exportar · Lembrar pendentes ·
            Duplicar evento · Apagar evento
```

- **Exportar** vai para o menu "···", junto de "Lembrar pendentes". Fica só o botão **Controle de tempo**.
- **Detalhes do evento** (nome, data, local, início, recalcular, forma de confirmação, modelo de carta) recolhido; abre sozinho em evento novo.
- **Resumo** (4 contadores) começa recolhido numa linha com os números; aberto, as pílulas servem de filtro (tocar de novo volta a "Todas"). A barra de filtros repetida sai.
- "Sem tempo" vira aviso âmbar tocável, só quando houver.

## (04) Partes sem orador recolhidas na lista

Como no Controle de tempo: cânticos, músicas, vídeos etc. ficam numa linha "▸ partes sem orador", já recolhida. Toque para abrir.

## (05) Cartão de cada designação mais limpo

```text
┌─────────────────────────────────┐
│ 10:15  4. Baraque           ··· │
│ 15 min ✓ Confirmado             │
│    [Ancião                    ] │
│    [Congregação               ] │
│    ▸ Informações só deste convite│
│    [⧉ Copiar convite]           │
└─────────────────────────────────┘
"···": Editar · Novo link (ou Novo PIN) ·
       ✓ Informar próximo orador · Nova parte abaixo ·
       Subir · Descer · Excluir
```

- "Link pessoal pronto" sai. **Novo link** vai para o "···". O lápis separado sai (Editar está no "···").
- **Confirmado / Aguardando / Recusado** não é prazo: mostra se o ancião já respondeu pelo link do convite. Fica pequeno embaixo do horário. "Recusado" continua tocável para ver o motivo.
- No modo PIN, o campo do PIN continua no cartão.

## (06) "Informar o nome do próximo orador?"

- Em Simpósio e Série de discursos vem marcado sozinho em todos os oradores, menos no último do grupo (ao importar e ao criar parte).
- Sai do cartão e vai para o "···" com ✓ quando ativo (também no Editar). Partes já salvas não mudam sozinhas.

## Detalhes técnicos
- Arquivos: `EventTimerFocus.tsx`, `BigEvents.tsx` e o ponto de criação das partes importadas (padrão do "próximo orador"). Estado recolhido/aberto só no aparelho. Sem mudança no banco, convites, links ou PDFs.
