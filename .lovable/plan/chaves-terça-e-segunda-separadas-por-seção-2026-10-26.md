# Chaves "Terça" e "Segunda" separadas por seção

Hoje, na aba Programação, as chaves "Terça" e "Segunda" valem para todo o modelo: ligar em Estudos e Revisitas também liga em Refeições e Transporte. A partir de agora, cada seção do modelo tem suas próprias chaves.

## Como fica

```text
+-----------------------------------------+
| ((Estudos e Revisitas))(Refeições)(Tra) |
| DIAS DA VISITA   Terça [●]  Segunda [ ] |
| ┆Ter┆(Qua)(Qui)(Sex)(Sáb)(Dom)           |
+-----------------------------------------+
        toca em "Refeições"
+-----------------------------------------+
| (Estudos e Revisitas)((Refeições))(Tra) |
| DIAS DA VISITA   Terça [ ]  Segunda [●] |  <- chaves próprias
| (Qua)(Qui)(Sex)(Sáb)(Dom)┆Seg┆           |
+-----------------------------------------+
```

- Cada seção (Estudos e Revisitas, Refeições, Transporte) guarda suas chaves e o dia escolhido, em cada modelo.
- "Já tem algo na terça/segunda" passa a olhar só a seção aberta. Por exemplo, uma refeição na terça não faz a terça aparecer em Estudos e Revisitas.
  - Estudos e Revisitas: os estudos e as observações do dia.
  - Refeições: as refeições e as observações do dia.
- O aviso ao desligar a terça continua igual, por seção.
- A aba Campo já tem uma lista só, então continua igual: suas chaves valem só para cada modelo de Campo.
- Nada salvo muda.

## Detalhes técnicos
- `_app.modelos.tsx`: chave de preferência `tpl-program:${activeSlot}:${section}`. `hasMonday`/`hasTuesday` filtram `activeItems` por `it.kind === section`. As notas do dia entram só na seção correspondente: `studyNotesBySlot` em study, `notesBySlot` em meal.
- Nenhuma mudança em `DayPills.tsx` nem em `template-day-pills.ts`. As preferências antigas (sem a seção) são simplesmente ignoradas.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
