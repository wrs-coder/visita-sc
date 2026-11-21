# Tempo por tópico independente do cronômetro

## Prévia (celular)
```text
┌──────────────────────────────┐
│  Cronômetro geral   12:40  ▶ │  <- continua igual, sozinho
├──────────────────────────────┤
│ ◀  ▶‖  3. Relatório    ▶     │
│        faltam 04:12          │
│        Próximo: Pioneiros    │
│        ↺ zerar tópico        │
│ ▾ Tempos dos tópicos (6)     │  <- toque recolhe/expande
│   1. Oração         2:00  ✓  │
│   2. Recomendações  1:35  ✓  │
│ ● 3. Relatório      0:48/5:00│
│   4. Pioneiros      --/8:00  │
│   ...                        │
└──────────────────────────────┘
```

## O que muda
1. **Relógio próprio**: o tempo por tópico ganha um relógio só dele. Play/pausa da linha não mexe no cronômetro geral, e vice‑versa.
2. **Avançar / voltar** (◀ ▶): troca de tópico sem iniciar nem pausar. Se estava rodando, segue rodando no novo tópico; se estava parado, continua parado.
3. **Cada tópico guarda o tempo usado**. Voltar para um tópico retoma de onde parou.
4. **Lista de tempos** recolhível abaixo: tempo usado / previsto de cada tópico, atual destacado, estourados em vermelho. Tocar numa linha seleciona aquele tópico (sem alterar play/pausa). Estado aberto/fechado fica no aparelho.
5. Zerar: zera só o tópico atual; segurar zera todos.

## Detalhes técnicos
- Novo `useAgendaTopicClock(visitId)` em `src/lib/elder-agenda/topic-clock.ts`: estado local `{ index, running, startedAt, usedSec: Record<blockId, number> }` em localStorage (`agendaTopicClock.<visitId>`), calculado por timestamp (sobrevive a recarga/tela cheia, funciona offline). Sem uso do `useOutlineTimer(agenda-<id>)`.
- Funções puras `next/prev/select/toggle/resetCurrent` com testes (trocar tópico preserva `running`; tempo acumula no tópico certo).
- `AgendaTopicRow` reescrito usando o novo relógio + lista recolhível; mesma linha em Leitura e tela cheia (compartilham a mesma chave, então ficam sincronizadas entre si, mas separadas do cronômetro).
- `topicAt` deixa de ser usado pela linha (mantido p/ compatibilidade).
- Atualizar regra no `src/components/elder-agenda/AGENTS.md`.
- Nada no servidor nem no conteúdo da pauta muda.
