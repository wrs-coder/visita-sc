# Pauta: tópicos com cartões à escolha

## A ideia
Hoje cada bloco da pauta é de um tipo só. Passa a ser assim:

- **Tópico** = o título numerado (ex.: "1. Encorajamentos e conselhos"), com minutos.
- Dentro de cada tópico, o superintendente escolhe **quais cartões** quer, em qualquer ordem, quantos quiser (ou nenhum).

Estilos de cartão disponíveis:

| Cartão | O que tem |
|---|---|
| Anotações | editor do esboço + Tema/Assunto opcional |
| Assistir, recapitular e meditar | linhas com ícone (livro / livros / play) + até 10 links |
| Informações dos anciãos | campo livre para os anciãos escreverem |
| Leitura e meditação do SC | recomendação final do superintendente |
| Recomendações de irmãos | puxa as recomendações do Programa dos anciãos |
| Assunto local | puxa os assuntos locais do Programa dos anciãos |

Cada cartão tem seu próprio selo **Só SC / C.Serviço / Todos** (ex.: no mesmo tópico, as anotações são só do SC e as informações dos anciãos são de todos).

## Tela "Montar pauta" (modo edição)
```text
┌─────────────────────────────┐
│ ‹ Pauta        Montar  Pronto│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 1  Encorajamentos e   ✎ │ │
│ │    conselhos    15 min  │ │
│ │ ─────────────────────── │ │
│ │ ≡ 📝 Anotações  Só SC ↑↓🗑│ │
│ │ ≡ ▶ Assistir e meditar  │ │
│ │       Só SC       ↑↓🗑   │ │
│ │ ≡ 👥 Info. dos anciãos   │ │
│ │       Todos       ↑↓🗑   │ │
│ │  ⊕ Adicionar cartão     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 2  Revisão das cartas ✎ │ │
│ │                  5 min  │ │
│ │ ≡ 📝 Anotações C.Serviço │ │
│ │  ⊕ Adicionar cartão     │ │
│ └─────────────────────────┘ │
│     ⊕ Adicionar tópico      │
└─────────────────────────────┘
```

Ao tocar "⊕ Adicionar cartão" abre uma folha de baixo (estilo One UI):
```text
┌─────────────────────────────┐
│        ━━━━                 │
│  Escolha o estilo do cartão │
│  📝 Anotações               │
│  ▶  Assistir, recapitular   │
│  👥 Informações dos anciãos │
│  📖 Leitura e meditação SC  │
│  🙋 Recomendações de irmãos │
│  📍 Assunto local           │
└─────────────────────────────┘
```

## Tela normal (preenchendo)
```text
┌─────────────────────────────┐
│ 1. ENCORAJAMENTOS E   15 min│
│    CONSELHOS               ⌄│
│  Tema/Assunto: ____________ │
│  [editor de anotações]      │
│  ── Assistir e meditar ──   │
│  📖 Texto…      Clique aqui │
│  ▶  Texto…      Clique aqui │
│  ── Informações dos anciãos │
│  [editor]          Todos    │
└─────────────────────────────┘
```

## O que continua igual
- Pautas e modelos já salvos abrem sem perder nada: cada bloco antigo vira um tópico com o cartão correspondente; no modelo padrão, "Assistir/meditar" e "Informações dos anciãos" passam a ser cartões dentro de "Encorajamentos e conselhos", e "Leitura e meditação do SC" fica num tópico final sem minutos.
- Numeração automática, prazo, uso sem internet, sincronização e exportação dos modelos, e os 3 estilos de PDF (cada tópico mostra seus cartões em ordem).
- Só o SC muda a estrutura; os outros preenchem os cartões que podem editar.

## Detalhes técnicos
- `agenda.ts`: payload v3 — `AgendaBlock` (tópico: id, title, minutes, hidden, cards[]) e `AgendaCard` (id, type: notes|links|eldersInfo|scReading|recs|local, perm, showSubject, subject, html, items, notes). Conversão v2→v3 e legado na leitura (`normalizeAgenda`), juntando reco/eldersInfo ao tópico "enc" quando vierem do padrão. Limites: 30 tópicos, 12 cartões por tópico.
- `mergeAgenda`: permissão passa a ser por cartão; estrutura (tópicos e cartões) só pelo SC; prazo inalterado.
- Modelos (`elder_agenda_templates`) e arquivo exportado: aceitam versão 1 (converte) e 2; sem mudança no banco (payload é jsonb).
- `ElderAgendaView.tsx`: render por tópico → cartões; editor com subir/descer/apagar cartão e folha de estilos; `agenda-pdf.ts` (3 estilos) percorre cartões.
- Testes: conversão v2→v3 sem perda, permissão por cartão (ancião não edita cartão Só SC no mesmo tópico), SC adiciona/remove cartões, numeração por tópico, importação de modelo antigo.
