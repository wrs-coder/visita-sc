# Tempo direto no cartão da parte (Simpósio / Série)

## O que muda
Hoje, quando falta o tempo de um discurso de Simpósio ou Série, o aviso "⚠ Falta inserir o tempo" abre o painel "Editar parte". Vamos trocar por um campinho de minutos no próprio cartão, no mesmo lugar onde o tempo aparece.

## Prévia

```text
┌──────────────────────────────────┐
│ 10:15  Imite aqueles que         │
│ Nº2    confiaram em Jeová!       │
│        — Baraque             ... │
│        Simpósio · [ __ ] min     │
│        ⚠ Falta inserir o tempo   │
└──────────────────────────────────┘
        digita "10" e confirma ↓
┌──────────────────────────────────┐
│ 10:15  Imite aqueles que         │
│ Nº2    confiaram em Jeová!       │
│        — Baraque             ... │
│        Simpósio · 10 min         │
└──────────────────────────────────┘
```

- Campo pequeno, só números (teclado numérico), com borda vermelha suave.
- Salva ao tocar fora ou em "OK" do teclado. Valores aceitos: 1 a 240.
- Depois de salvo, o campo e o aviso somem e o tempo aparece como texto normal. Para mudar depois, continua sendo pelo "..." → Editar.
- Em itens "•" da Série, o tempo continua marcado como "(informativo)" e não empurra o programa (regra atual).
- O aviso âmbar "X partes sem tempo" no topo e o filtro diminuem sozinhos.

## Detalhes técnicos
- `PartItem` em `BigEvents.tsx`: substituir o botão `onEdit` (linha ~860) por um `<input inputMode="numeric">` inline com estado local; no blur/Enter chama `onPatch(part.id, { duration_min })` (mesmo caminho usado pelo editor, sem mudança de banco).
- Mostrar o campo para qualquer parte de orador sem `duration_min` que seja Simpósio/Série (mesma condição atual).
- Teste unitário pequeno para a validação 1–240.
