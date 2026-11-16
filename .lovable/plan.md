# Cronômetro flutuante no Modo Esboço + correção das notas de Pastoreio

## (01) Cronômetro como "boia" flutuante no Modo Esboço

É possível e seguro: muda só onde o cronômetro aparece. A contagem, o tempo alvo, os alertas e os tempos por tópico continuam iguais.

```text
┌─────────────────────────────┐
│ 📄 Discurso público      ✕  │
│ A- A+  ↺   ⌃               │
├─────────────────────────────┤
│ 1. Introdução               │
│    Texto do ponto...        │
│ 2. Primeiro ponto           │
│    Rm 12:2 (1)              │
│    ...                      │
│ 3. Segundo ponto ┌────────┐ │
│    ...           │⏱ 12:34 │ │  ← boia flutuante
│                  │ ▶  ⟲   │ │    (fica parada ao rolar)
│                  └────────┘ │
└─────────────────────────────┘
```

- A boia fica sempre visível enquanto você rola o esboço.
- Para mudar de lugar, arraste a boia. Ao soltar, ela se prende à borda mais próxima, como os balões flutuantes do One UI. O aparelho guarda essa posição.
- Toque no número para iniciar ou pausar. O botão ⏱ continua abrindo o tempo alvo.
- Toque duas vezes ou segure para recolher: a boia vira uma bolinha só com o tempo. Toque de novo para abrir.
- A boia nunca cobre o botão ✕ nem a barra do topo. Ela respeita as bordas do aparelho e o entalhe da câmera.
- Só muda no Modo Esboço. No modo edição, o cronômetro continua na barra.

## (02) Falha nas notas de Pastoreio

**Causa encontrada:** a tela da nota abre dentro do próprio cartão da lista. A lista usa uma otimização de rolagem que "corta" tudo o que fica dentro de cada cartão. Por isso a nota aparece como uma faixa fina, com as outras notas embaixo. Em uma nota nova, o espaço chega a ficar vazio.

**Correção:** a nota passa a abrir por cima de toda a tela, separada da lista, como no Samsung Notes.

```text
Lista (Pastoreio)              Ao tocar no cartão
┌───────────────────────┐      ┌───────────────────────┐
│ Pastoreio ▾   🔍 ⋯ +  │      │ ←  Família Silva 📖⤢🗑✓│
├───────────────────────┤      ├───────────────────────┤
│ ☐ Família Silva       │ ──▶  │ Data      [16/11/2026]│
│   16 nov · João       │      │ Acompanhante [João   ]│
│   Encorajar leitura...│      │ Envolvidos  [.......] │
│   📝 Esboço · 🖼 2     │      │ Informações [.......] │
├───────────────────────┤      │ Esboço do pastoreio   │
│ ☐ Irmã Ana            │      │ ┌───────────────────┐ │
│   ...                 │      │ │ escreva aqui...   │ │
└───────────────────────┘      │ └───────────────────┘ │
                               │ [barra no rodapé]     │
                               └───────────────────────┘
```

- **"+ Novo › Pastoreio":** cria a nota e já abre direto na tela cheia, pronta para preencher os campos e o esboço.
- **Notas vindas do Programa da visita:** ao tocar, abrem na tela cheia, com os campos já preenchidos.
- Voltar (← ou gesto do Android) salva e fecha a nota, como já acontece hoje.

## Detalhes técnicos

- `PastoralNoteDetail` passa a usar `createPortal(..., document.body)`, porque `.list-optimized > *` usa `content-visibility: auto`. Isso cria contenção de layout e pintura, que prende o `fixed inset-0` dentro do cartão. A mesma verificação será feita no `FullscreenOutline` aberto a partir dela.
- Ao criar uma nota `pastoral`, ela abre na hora (estado `autoOpenId` em `_app.notas.tsx`).
- `OutlineTimer` ganha a variante `"floating"`, usada só em `FullscreenOutline`:
  - fica em `position: fixed` via portal, com `z-[110]`;
  - arrasta com pointer events e se prende à borda mais próxima;
  - posição e estado recolhido ficam em `localStorage` (novo `timer-float-prefs.ts`), que é preferência do aparelho;
  - respeita `env(safe-area-inset-*)`.
- `useOutlineTimer`, `OutlineInactivitySensor` e os tempos por tópico não mudam.
- Testes:
  - função pura de "prender à borda" e limites de tela;
  - teste de que a nota pastoral renderiza fora do container da lista.
- Uma regra nova no `AGENTS.md` sobre overlays em listas com `content-visibility`.
