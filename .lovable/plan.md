# Refinar o Controle de tempo (estilo dos modelos enviados)

## O que muda
A tela continua escura, em lista no estilo do Programa, mas cada parte ganha o visual dos modelos:

```text
+-------------------------------------+
| Assembleia de Circuito...   [⏱|⏳]  |  <- escolha Cronômetro / Temporizador
| ▶ 10:00   ▶ 14:00   Programa +3 min |
|-------------------------------------|
| ⏰ Manhã                            |
|-------------------------------------|
| 1. Por que confiar em Jeová...  +--------+
|  ▶10:00 ▶10:02 [🔔 05]          | 02:11  |  vermelho = estourou
|  Fernando Rui - SC              | (2min) |
| ███████████████████████████████ +--------+
| [icone] Série de discursos: Imite...|  (amarelo, faixa)
| 2. • Baraque (16min)            +--------+
|  ▶10:16 ▶10:18 [🔔 02]          | 01:59  |  verde = no tempo
|  Wanderson - Cong. Vila Sul     | (16min)|
| ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░ +--------+
| 3. • A mulher sunamita (15min)  +--------+
|  ▶10:32  --:--                  |   ⏱    |  cinza = ainda não iniciada
|  Lucas - Cong. Flores           +--------+
+-------------------------------------+
```

Cada linha mostra:
- Número e tema (azul nas partes comuns, amarelo nos "•" da série).
- ▶ horário previsto e ▶ horário em que realmente começou.
- Pílula de sino: minutos que faltam (verde) ou passou do tempo (vermelho; âmbar no último minuto).
- Orador e congregação.
- Caixa grande à direita com relógio em números digitais e o tempo previsto embaixo; tocar nela inicia/encerra aquela parte (qualquer ordem, como hoje).
- Barra de progresso fina abaixo da parte.
- Separadores "Manhã" / "Tarde" quando houver intervalo, e a faixa amarela da Série de discursos.

## Cronômetro ou Temporizador
Botão segmentado no topo (estilo iOS):
- **Temporizador**: relógio conta para baixo (16:00 → 00:00 → -00:45 em vermelho).
- **Cronômetro**: relógio conta para cima (00:00 → 16:45).
A escolha fica salva no aparelho; o relatório, desvios e a bolha flutuante funcionam igual nos dois modos.

## O que não muda
Regras da série (os "•" somam no título sem empurrar o programa), pausa, refazer/corrigir tempos, relatório PDF, bolha Android, nada no servidor.

## Detalhes técnicos
- `event-timer.ts`: guardar `startedAt` real por parte (já derivável dos registros) e preferência `mode: "down" | "up"` em localStorage por aparelho; função `displayFor(mode, planned, spent)`.
- `EventTimerFocus.tsx`: novo layout de linha, caixa digital (fonte monoespaçada tabular), cores via tokens em `styles.css` (timer-ok/warn/over/idle, série amarela), separadores Manhã/Tarde pelo maior intervalo/12:00.
- Bolha nativa recebe o texto conforme o modo.
- Testes novos para os dois modos; typecheck e vitest.
