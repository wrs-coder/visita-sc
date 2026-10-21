# Cartão "Reuniões da semana" com títulos em cada informação

## O que muda (só visual)
Cada reunião aparece como um bloco próprio: no topo, o nome da reunião com dia e horário. Embaixo, cada informação em uma linha com o título em letra pequena e o conteúdo ao lado, por exemplo:

```text
Meio de semana · Ter · 19:30
  Presidente da reunião   João Silva
  Tema: Discurso de serviço   "..."
  Oração final            Pedro Souza
  Cântico final           151
```

Títulos usados em cada reunião (são os campos já preenchidos na aba "Reuniões e Discursos"):
- **Meio de semana:** Presidente da reunião · Tema: Discurso de serviço · Cântico final · Oração final
- **Fim de semana:** Cântico inicial · Discurso Público · Discurso Final (Tema) · Cântico final
- **Pioneiros:** Tema · Oração inicial · Oração final · Local

Uma informação que não foi preenchida não aparece, para o cartão não ficar com linhas vazias. Reuniões entre si ficam separadas por uma linha fina.

## O que não muda
Dados, banco, aba "Reuniões e Discursos", ordem por dia, botão "Ver todos", recolher/expandir.

## Observações
- Hoje o app não tem campo de "Oração inicial" nem "Cântico inicial" para o meio de semana, nem "Presidente"/"Orações" para o fim de semana. Esses títulos só aparecem nas reuniões que já têm esse campo. Criar campos novos seria uma mudança de recurso e fica fora deste ajuste.
- A reunião com Anciãos e Servos não tem data fixa, por isso continua fora desse cartão, como hoje.

## Detalhes técnicos
- `_app.dashboard.tsx`: acrescentar `final_song`, `opening_song`, `closing_song`, `final_talk` ao `MeetingTodayItem`. Cânticos vêm de `useVisitTemplateExtras(visit.id)` (override da visita, depois o modelo), lidos no render — nada é gravado.
- Trocar o `render` do `WeekGroups` por uma lista `<dl>` (grid 2 colunas: `dt` em `text-xs text-muted-foreground`, `dd` em `text-sm`), montada por uma tabela de campos por `kind`. Fim de semana passa a mostrar Discurso Público e Discurso Final separados.
- Rótulos reaproveitam chaves i18n existentes (`meetingsTalks.midweek.*`, `weekend.*`, `pioneer.*`, `fromTemplate.*Song`); novas só se faltar (pt/en/es).
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px.
