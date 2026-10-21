# Cartão "Reunião de Campo" com títulos em cada informação

## O que muda (só visual)
Cada turno fica em um bloco próprio, no mesmo estilo do cartão "Reuniões da semana". No topo aparecem o turno, o horário e a modalidade. Embaixo, cada informação vem com o seu título:

```text
Manhã · 09:00 · Casa em Casa
  Local da Reunião de Campo   Salão do Reino
  Território S-13             12
  Localização do território   Bairro Centro
  Dirigentes auxiliares       João, Pedro
  Oração final                Marcos
```

- Uma informação não preenchida não aparece.
- Os turnos ficam separados por uma linha fina.
- O conteúdo de **"Informações adicionais do superintendente"** deixa de aparecer neste cartão. Ele continua salvo e visível na aba "Reuniões e Discursos".

## O que não muda
Dados, banco, aba "Reuniões e Discursos", ordem por dia, botão "Ver todos", recolher/expandir e o cronograma "Hoje".

## Detalhes técnicos
- `_app.dashboard.tsx`: trocar o `render` do `WeekGroups` do cartão `visit-field-meeting` pela mesma `<dl>` em duas colunas usada em "Reuniões da semana" (`dt` em `text-xs text-muted-foreground`, `dd` em `text-sm`, linhas vazias filtradas).
- Os rótulos reaproveitam as chaves que já existem em `meetingsTalks.field.*` (`location`, `territoryNumber` mostrado como "Território S-13", `territoryLocation`, `auxiliaryLeaders`, `closingPrayer`) em pt/en/es, com texto de reserva em português.
- Remover só a linha de exibição de `f.observations`; a consulta continua igual.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
