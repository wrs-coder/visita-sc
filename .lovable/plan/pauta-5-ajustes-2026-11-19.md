# Pauta – 5 ajustes

## O que encontrei
- Tela cheia: a barra de baixo só usa a margem padrão do navegador. No Android (app instalado) essa margem vem zerada, por isso Anterior/Próximo ficam atrás dos botões do sistema. O resto do app já usa uma margem extra própria do Android, que a pauta não usa. O mesmo vale para o topo.
- Esposa: o painel dela não mostra a Pauta, e o servidor recusa o código da esposa (termina com "*"). Isso já está correto e vai ganhar um teste para não regredir.
- Hoje só o SC exporta o PDF e escolhe o modelo, que fica guardado só no aparelho dele.

## Mockups

Tela cheia (topo e rodapé acima das barras do Android)
```text
┌───────────────────────────────┐
│ ▂▂ barra de status ▂▂▂▂▂▂▂▂▂ │
│ ✕  2 de 5 · Recomendações  ⏱ │
├───────────────────────────────┤
│ 2.1 — João Silva              │
│ Família: ...                  │
│ Grupo: ...                    │
│ ───────────────────────────── │  ← divisória entre irmãos
│ 2.2 — Pedro Lima              │
│ Família: ...                  │
├───────────────────────────────┤
│ [ ‹ Anterior ] [ Próximo › ]  │
│ ◁   ○   ▢   (barra Android)   │
└───────────────────────────────┘
```

Tela da Pauta (nova ordem)
```text
┌───────────────────────────────┐
│ [ ✎ Montar pauta ] [ Modelos ]│  (só SC)
├───────────────────────────────┤
│   Pauta – Reunião com Anciãos │
│  Isa 50:4; Pro 18:13,17; ...  │
│ Sequele · Sex 20/11 · 20:00   │
│ [ ⤢ Tela cheia ] [ ⬇ PDF ]    │
├───────────────────────────────┤
│ Orações e tempo         ⌄     │  ← recolhe/expande
│ Oração inicial   [.........]  │
│ Oração final     [.........]  │
│ Tempo total          45 min   │
│ ───────────────────────────── │
│ Prazo para os anciãos         │  (só SC)
│ [ 20/11/2026 18:00 ]   ✕      │
└───────────────────────────────┘
```
Ancião no PDF: toca "PDF" e baixa direto, sem escolher modelo.
SC no PDF: continua com a folha de 3 modelos; a escolha passa a valer para os anciãos.

## O que muda
1. Tela cheia: topo e rodapé respeitam as barras do Android; divisória fina entre cada recomendação.
2. Cartão "Orações e tempo" recolhível (estado guardado no aparelho, igual aos tópicos). O prazo vai para dentro dele, abaixo de "Tempo total" (só o SC vê o campo).
3. Anciãos (com e sem cadastro) ganham o botão PDF, sempre no modelo que o SC escolheu. O SC escolhe na folha atual; a escolha vai junto da pauta.
4. Esposa: sem mudança de tela; teste garantindo que o código dela não abre a pauta.
5. "Montar pauta / Modelos" sobe para o topo; o cartão com título, versículos, data e Tela cheia fica logo abaixo.

## Detalhes técnicos
- `ElderAgendaFullscreen.tsx`: header/footer com `max(env(safe-area-inset-*), var(--safe-area-inset-*))` (classes `safe-bottom`/equivalente de topo de styles.css); `divide-y`/border entre recs.
- `AgendaPayload` ganha `pdfStyle?: AgendaPdfStyle` (opcional, ausente = "timeline"); normalizador aceita payloads antigos. SC grava em payload + localStorage; ancião usa `payload.pdfStyle`. `exportAgendaPdf` reutilizado, cartões ocultos e nota privada continuam fora do PDF (já filtrados para papel elder).
- `ElderAgendaView.tsx`: reordenar blocos; cartão de orações com o mesmo padrão de recolher dos tópicos (`closed["__prayers"]`); mover bloco do prazo.
- Teste: `visitForInvite("XXXX*")` retorna null; normalização de `pdfStyle`; ancião não tem seletor.
- Sem mudança no banco de dados.
