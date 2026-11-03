# Ajustes antes da nova versão

## (01) Retirar a frase do calendário
Some a frase "3 meses por folha (deitada) — o semestre cabe em 2 folhas." No lugar, nada (ou, se preferir, "Até 6 meses em 1 folha deitada").

## (02) e (03) Períodos de exportação
```text
┌───────────────────────────────┐
│ Exportar itinerário        ✕  │
│ Formato  [PDF] [Word] [Excel] │
│ Estilo   [Lista] [Calendário] │
│ Período                       │
│ [1º Semestre] [2º Semestre]   │
│ [Ano de serviço] [Tudo]       │
│ [Personalizado]               │
│ ┌───────────────────────────┐ │  ← só aparece em
│ │ De   [ 01/09/2026 ]       │ │    "Personalizado"
│ │ Até  [ 28/02/2027 ]       │ │
│ └───────────────────────────┘ │
│ Set 2026 – Fev 2027           │  ← resumo do período
│ Incluir semanas sem visita (●)│
│ [   Gerar e partilhar   ]     │
└───────────────────────────────┘
```
- 1º Semestre: setembro a fevereiro do ano seguinte. 2º Semestre: março a agosto.
- O semestre escolhido é o do ano de serviço atual (ex.: hoje, nov/2026 → 1º = set/2026–fev/2027; 2º = mar–ago/2027). Padrão inicial: o semestre em que estamos.
- Personalizado: duas datas; se "Até" for antes de "De", o botão fica desativado com aviso. Calendário com mais de 6 meses continua avisando que terá mais de 1 folha.
- "Próximos 6 meses" sai (substituído pelos semestres).

## (04) Botão "Lido" no leitor da Bíblia
Hoje o botão azul "✓ Lido" aparece antes de você marcar, parecendo que já foi lido. Recomendação (padrão iOS/One UI de "estado"):

```text
Ainda não lido:            Já lido:
┌──────────────────────┐   ┌──────────────────────┐
│‹ 1 Tes 4  [✎ Ponto alto][Aa🔊][○ Lido] │   │‹ 1 Tes 4  [✎ Ponto alto][Aa🔊][✓ Lido] │
└──────────────────────┘   └──────────────────────┘
 contorno cinza, círculo     preenchido verde,
 vazio = "toque p/ marcar"   check = concluído
```
- Não lido: botão com contorno, círculo vazio ○ e texto "Lido" (como uma caixinha de marcar).
- Lido: verde preenchido com ✓ "Lido" e uma vibração leve + aviso "Capítulo marcado como lido".
- Tocar de novo desmarca (comportamento atual mantido). Mesma largura nos dois estados, então o topo não estoura.

## Detalhes técnicos
- `itinerary-export.ts`: `PeriodMode` = sem1 | sem2 | serviceYear | all | custom; `periodRange(mode, today, custom?)`; testes para sem1/sem2 (incl. virada de ano) e custom invertido.
- `ItineraryExportSheet.tsx`: pílulas novas, inputs de data nativos, resumo, remoção da frase.
- `CleanReader.tsx`: só aparência do botão (ícone Circle/CheckCircle, variante outline vs token de sucesso); lógica `onDone` intacta.
- Ajuda atualizada; versão não sobe.
