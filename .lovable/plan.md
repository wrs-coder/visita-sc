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

---

# Ajuste 2: Importação .rtf com 1 minuto a menos

Ao importar o .rtf, o tempo de cada designação é a diferença até a próxima parte. Os esboços sempre vêm com 1 minuto a menos, então:

```text
10:15  Discurso Nº1   →  9 min  (antes 10)
10:25  Discurso Nº2   →  ...
```

- Vale só para partes com orador (discursos, simpósio, série). Cânticos, intervalo, almoço etc. ficam como estão.
- Nunca fica menor que 1 min. O horário de cada parte não muda (o minuto que sobra fica como transição).
- Técnico: `rtf-program-import.ts` linha ~103 → `duration_min = d - 1` quando `assigned_to === "speaker"` e `d > 1`. Atualizar `rtf-program-import.test.ts` (ex.: 10 → 9).

---

# Ajuste 3: "Finalizar agora" voltando depois de "Confirmar fim da visita"

1. Ao confirmar, tirar a visita na hora da tela e da cópia guardada no aparelho, para que nenhuma releitura a traga de volta.
2. Incluir na limpeza as seções novas (Programa com o Corpo de Anciãos, Visitas Pastorais, recomendações, matérias locais e temas aplicados), feitas em paralelo e com tempo limite, e por último apagar a visita.
3. Se a internet cair no meio, a visita fica marcada como finalizada no aparelho e a limpeza termina na próxima sincronização, sem reaparecer o aviso.
4. A busca do aviso só olha as congregações do superintendente.
- Sem mudança no banco. Teste: depois de confirmar, a lista de visitas a finalizar fica vazia mesmo com a cópia antiga do aparelho.
