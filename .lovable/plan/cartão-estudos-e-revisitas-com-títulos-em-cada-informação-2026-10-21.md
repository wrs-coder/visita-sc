# Cartão "Estudos e Revisitas" com títulos em cada informação

## O que muda (só visual)
Cada turno fica em um bloco próprio, no mesmo estilo dos cartões "Reuniões da semana" e "Reunião de Campo". No topo aparecem o turno e o horário. Embaixo, cada informação vem com o seu título:

```text
Manhã · 09:00
  Local de encontro           Salão do Reino
  Acompanhante para estudos   João Silva
  Acompanhante para           Superintendente
  Telefone de contato         (11) 99999-9999
```

- Uma informação não preenchida não aparece.
- Os turnos ficam separados por uma linha fina.
- As observações do turno, se houver, continuam aparecendo no fim do bloco, como hoje, com o título "Observações".

## O que não muda
Dados, banco, aba "Estudos e Revisitas", ordem por dia, botão "Ver todos", recolher/expandir e o cronograma "Hoje".

## Detalhes técnicos
- `_app.dashboard.tsx`: trocar o `render` do `WeekGroups` do cartão `visit-studies` pela mesma `<dl>` em duas colunas (linhas vazias filtradas).
- Rótulos de `fieldStudies.meetingPoint`, `companion`, `companionFor` e `contactPhone`, que já existem em pt/en/es. "Acompanhante para" mostra o nome traduzido do papel (`ACOMPANHANTE_FOR_LABEL`).
- Validar com `bunx tsgo --noEmit`.
