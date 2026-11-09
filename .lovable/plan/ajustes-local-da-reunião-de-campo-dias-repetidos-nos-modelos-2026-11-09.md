# Ajustes: Local da reunião de campo + dias repetidos nos Modelos

## 01 — "Local da Reunião de Campo" dentro do bloco dos anciãos

Hoje, em Programa da visita › Reuniões › Campo, o campo "Local" fica acima e fora do bloco cinza. Ele passa a ser o primeiro item dentro do bloco, continua obrigatório (vermelho se vazio), conta no "Faltam N campos" e mantém o botão "Copiar para…".

```text
ANTES                              DEPOIS
┌───────────────────────────┐      ┌───────────────────────────┐
│ Qua · Manhã · 08:30       │      │ Qua · Manhã · 08:30       │
│ Local da reunião *        │      │ ▼ A ser preenchido pelos  │
│ [                     ]   │      │   Anciãos        Faltam 3 │
│ Copiar para…              │      │ ┌───────────────────────┐ │
│ ▼ A ser preenchido pelos  │      │ │ Local da reunião *    │ │
│   Anciãos        Faltam 2 │      │ │ [                   ] │ │
│ │ Nº território S-13      │      │ │ Copiar para…          │ │
│ │ Dirigentes auxiliares   │      │ │ Nº território S-13    │ │
└───────────────────────────┘      │ │ Dirigentes auxiliares │ │
                                   │ └───────────────────────┘ │
                                   └───────────────────────────┘
```

O bloco passa a aparecer sempre (o Local é sempre pedido), mesmo quando nenhum item opcional foi marcado no modelo. Nada muda no que é salvo.

## 02 — O dia aparece só uma vez nos Modelos visitas

Concordo: depois de tocar no dia nas pílulas "Dias da Visita", repetir o dia é redundante. Hoje o dia aparece 3 vezes:
1. Pílula do dia (fica — é a única escolha).
2. Título do dia com ▶/▼ (recolher/expandir) — **sai**.
3. Seletor de dia dentro de cada evento — **sai**.

```text
ANTES                              DEPOIS
┌───────────────────────────┐      ┌───────────────────────────┐
│ Dias: (Qua)(Qui)(Sex)     │      │ Dias: (Qua)(Qui)(Sex)     │
│ ▼ QUARTA-FEIRA            │      │ ┌───────────────────────┐ │
│ ┌───────────────────────┐ │      │ │ Manhã ▾  08:30   🗑   │ │
│ │ Quarta ▾ Manhã ▾ 08:30│ │      │ │ Modalidade ▾          │ │
│ │ Modalidade ▾          │ │      │ └───────────────────────┘ │
│ └───────────────────────┘ │      │ [ + Adicionar ]           │
└───────────────────────────┘      └───────────────────────────┘
```

Vale para as subabas Refeições, Transporte, Estudos e Campo. Cada evento continua podendo ser recolhido sozinho (resumo "Manhã · 08:30 · Casa em casa"), e as anotações do dia (Refeições/Estudos) continuam no topo, só sem o título repetido.

Observação: o seletor interno servia para **mover** um evento para outro dia. Sem ele, para mudar o dia basta apagar e criar no dia certo. Nenhum dado existente muda: os eventos continuam ligados ao mesmo dia de antes.

A subaba Reuniões (Pioneiros/Anciãos) não usa pílulas de dia, então o seletor "Dia da semana" dela permanece.

## Detalhes técnicos
- `FieldMeetingsPanel.tsx`: mover o bloco do `meeting_location` (+ `CopyToDays`) para dentro de `EldersFillSection`; incluir location em `filled`/`total`; renderizar a seção sempre.
- `_app.modelos.tsx` (`KindBlock` com `onlyDay`): remover `CollapseIdToggle` + rótulo do dia e o `Select` de `day_offset`; manter `dayExtra` e `CollapseItem`.
- `_app.modelo-reunioes-de-campo.tsx`: remover cabeçalho `day:${d}` e o `Select` de dia do item; ajustar ids do `CollapseAllButton`.
- Sem mudança em banco, servidor, salvamento ou formato. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
