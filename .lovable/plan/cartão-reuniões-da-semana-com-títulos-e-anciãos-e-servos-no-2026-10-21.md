# Cartão "Reuniões da semana" com títulos e Anciãos e Servos no horário

## O que muda (só visual)
Cada reunião aparece como um bloco próprio: no topo, o nome da reunião com dia e horário. Embaixo, cada informação em uma linha com o título em letra pequena e o conteúdo ao lado, por exemplo:

```text
Meio de semana · Ter · 19:30
  Presidente da reunião   João Silva
  Tema: Discurso de serviço   "..."
  Oração final            Pedro Souza
  Cântico final           151
```

Títulos usados em cada reunião (campos já preenchidos na aba "Reuniões e Discursos"):
- **Meio de semana:** Presidente da reunião · Tema: Discurso de serviço · Cântico final · Oração final
- **Fim de semana:** Cântico inicial · Discurso Público · Discurso Final (Tema) · Cântico final
- **Pioneiros:** Tema · Oração inicial · Oração final · Local
- **Anciãos e Servos (novo no cartão):** Tema · Oração inicial · Oração final · Local

Uma informação não preenchida não aparece, para o cartão não ficar com linhas vazias. As reuniões ficam separadas por uma linha fina.

## Dia e horário de Pioneiros e Anciãos e Servos
- As duas reuniões passam a usar o campo **"Dia e Horário (definido pelo Superintendente)"** das abas Pioneiros e Anciãos e Servos (o ajuste da visita, ou o do modelo quando a visita não tem ajuste).
- Assim, Anciãos e Servos aparece no cartão "Reuniões da semana" e também no cronograma **"Hoje"** (e "Amanhã"), no seu horário, junto com as outras atividades.
- Pioneiros segue a mesma regra. Se esse campo estiver vazio, continua usando a data de hoje, para nada sumir.
- Se o campo estiver vazio em Anciãos e Servos, a reunião não aparece, porque não há outra data para usar.

## O que não muda
Dados, banco, aba "Reuniões e Discursos", ordem por dia, botão "Ver todos", recolher/expandir.

## Observação
O app não tem campos de "Oração inicial" nem de "Cântico inicial" no meio de semana, nem de "Presidente" ou "Orações" no fim de semana. Esses títulos só aparecem nas reuniões que já têm esse campo. Criar campos novos mudaria o recurso, por isso fica fora deste ajuste.

## Detalhes técnicos
- `_app.dashboard.tsx`: acrescentar ao `MeetingTodayItem` os campos `final_song`, `opening_song`, `closing_song` e `final_talk`. Os cânticos e o dia/horário vêm de `useVisitTemplateExtras(visit.id)` (primeiro o ajuste da visita, depois o modelo). Tudo é só lido, nada é gravado.
- Carregamento: ler também `elders_servants_meetings` (theme, opening_prayer, closing_prayer, location) via `readOneWithMirror`. Uma função pura transforma `weekday` (0 = segunda, como em `report-schedule.ts`) + `meeting_time` na data dentro dos dias da visita e no horário. Se o campo estiver vazio, Pioneiros usa `super_meeting_at ?? meeting_at`. Os extras entram nas dependências do efeito. O cronograma já é montado a partir dessa lista, então Hoje e Amanhã recebem a reunião sem outra mudança.
- Render do `WeekGroups`: uma lista `<dl>` em duas colunas (`dt` em `text-xs text-muted-foreground`, `dd` em `text-sm`), montada por uma tabela de campos para cada tipo de reunião.
- Os rótulos reaproveitam as chaves i18n que já existem (`meetingsTalks.midweek.*`, `weekend.*`, `pioneer.*`, `elders.*`, `fromTemplate.*Song`). Só entram chaves novas se faltar alguma (pt/en/es).
- Teste da função pura (dia da semana e horário corretos, campo vazio). Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px.
- Registrar no roadmap.md o pedido de Anciãos e Servos no cronograma.
