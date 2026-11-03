# Ajustes: calendário com eventos juntos, editar semana, "SC. Substituto"

## (01) Calendário mostra tudo da mesma semana

Hoje, quando a mesma semana tem mais de um item (ex.: "Semana de pioneiro - Assembleia" + "EMR-SC 16-17_Fev" + uma visita), as faixas são desenhadas umas por cima das outras e só uma aparece.

Novo: cada item ganha sua própria faixa, empilhada dentro da semana (até 3 faixas, finas). Se houver mais, aparece "+1".

```text
┌ FEVEREIRO 2027 ──────────────────┐
│ S   T   Q   Q   S   S   D        │
│ 15  16  17  18  19  20  21       │
│ [Visita · Jd. Alvorada        ]  │
│ [Pioneiro - Assembleia        ]  │
│     [EMR-SC 16-17_Fev ]          │
└──────────────────────────────────┘
```

- A folha continua única (6 meses); só a altura das faixas se ajusta quando há mais de uma.
- A lista (PDF, Word e Excel) já mostra uma linha por item; vou conferir que nenhuma fica de fora.

## (02) Editar semana sem visita

No cartão da semana, toque no cartão (ou no lápis) para abrir a mesma janela de criação, já preenchida. O botão vira "Salvar alterações".

```text
┌──────────────────────────────────┐
│ ☀ Pioneiro  16 fev – 21 fev 2027 │
│ Assembleia               ✎   🗑  │
└──────────────────────────────────┘
          ↓ toque em ✎
┌ Editar semana ───────────────────┐
│ Tipo     [ Pioneiro        ▾ ]   │
│ Início   [ 16/02/2027 ]          │
│ Fim      [ 21/02/2027 ]          │
│ Observ.  [ Assembleia      ]     │
│        Cancelar   Salvar         │
└──────────────────────────────────┘
```

## (03) "SC. Substituto" no Tipo de visita

Nova opção na lista: Visita · Visita + Pastoreio · Visita + Treinamento SCS · Visita SCS · **SC. Substituto**. Ao escolher, aparecem os mesmos campos do substituto (nome, contato) já usados em "Visita SCS".

## Ajuda
Atualizar o painel de Ajuda (Itinerário) com a edição de semana e a nova opção.

## Detalhes técnicos
- `itinerary-export.ts` (`itineraryPdfCalendar`): atribuir "lanes" por semana (ordem: visita primeiro, depois semanas sem visita); `barH = min(5, (rowH-3.6)/lanes)`; texto sempre desenhado quando cabe; teste novo garantindo 3 itens sobrepostos geram 3 faixas.
- `ItineraryWeeks.tsx`: estado `editingId`; `openEdit(w)` preenche tipo/nome personalizado via `parseCustomType`; `save` usa `update().eq("id")` quando editando. Sem mudança no banco.
- `_app.configuracoes.tsx`: adicionar "SC. Substituto" em `VISIT_TITLE_OPTIONS` e trocar `form.title === "Visita SCS"` por um helper `isSubstituteTitle` em todos os pontos (exibição, salvar, PDFs) que conferem esse título.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Versão não muda.
