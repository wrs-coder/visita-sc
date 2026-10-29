# Grandes Eventos — edição completa de partes e convites

## Mockup (celular)

```text
+-------------------------------------+
| Assembleia de Circuito 2027    ⌄    |
| 14/03/2027 · Salão X      12/18 ✓   |
|-------------------------------------|
| [ 14/03/2027 ] [ Local          ]   |
| Início do programa  [ 09:40 ]  ↻    |  <- recalcula horários
| Informações adicionais (todos)      |
| [______________________________]    |
| [⤓ Word] [Faltam 6] [Recusas 1] ··· |  <- filtros rápidos
|-------------------------------------|
| 09:40 Nº1  Tema da parte       ✎ ⋮  |
|        Discurso · 15 min            |
|   Orador [ João Silva        ]      |
|   Congreg.[ Central          ]      |  <- auto ao escolher ancião
|   Info. só deste convite  ⌄         |
|   PIN [123456] ↻ Novo PIN           |
|   ☑ Informar o nome do próximo orador? |
|   [Copiar convite]  ● Aguardando    |
|-------------------------------------|
| 09:55 Nº2  ...                 ✎ ⋮  |
|            [ + Nova parte ]         |
+-------------------------------------+

  ⋮ da parte: Editar · Subir · Descer · Excluir

+-------- Nova parte / Editar --------+
| Tema   [_________________________]  |
| Nº [ 3 ]   Tipo [ Discurso      ▾]  |
|  Discurso · Entrevistas · Simpósio  |
|  A Sentinela · Discurso Batismo ·   |
|  Discurso Público · Outro [____]    |
| Tempo [ 15 ] min                    |
| Horário inicial                     |
|  (•) Automático (após anterior) 10:10|
|  ( ) Manual [ __:__ ]               |
| Designado: (Orador)(SC)(Filial)(—)  |
|          [Cancelar]   [Salvar]      |
+-------------------------------------+
```

## O que muda

1. **Editar partes importadas ou criadas**: ícone ✎ abre a mesma janela da "Nova parte" com todos os campos preenchidos. Menu ⋮ permite subir/descer e **excluir** (com confirmação; aviso extra se o orador já confirmou).
2. **Hora inicial do evento**: campo "Início do programa". Botão ↻ recalcula o horário de todas as partes em modo automático somando os tempos anteriores; partes com horário manual ficam como estão e servem de nova base para as seguintes.
3. **Informações adicionais individuais**: campo recolhível em cada parte, enviado só no convite daquele orador, depois das informações gerais do evento.
4. **Congregação do orador**: campo ao lado do nome; preenchido sozinho ao escolher um ancião da lista (editável). Aparece no convite ("Orador: João — Central") e também na linha "Próximo orador: Pedro — Vila Nova" quando a caixa estiver marcada.
5. **Nova parte** com Tema, Nº, Tipo (lista pedida + "Outro" com texto livre), Tempo, Horário inicial automático ou manual, e a quem está designada. Entra no fim da lista (ou depois da parte escolhida no ⋮).

## Sugestões extras (incluídas)

- Filtros rápidos "Faltam confirmar" e "Recusas" para achar pendências sem rolar.
- Aviso discreto quando o horário de uma parte manual se sobrepõe à anterior.
- "Duplicar evento" no menu ⋮ do evento (copia partes e tempos, sem oradores/PINs) — útil para o mesmo programa em outro dia/local.
- Exportação Word e convites passam a incluir congregação e informações individuais.

Fica igual: link único por evento + PIN, bloqueios, página pública de confirmação, importação .etim.

## Detalhes técnicos

- Banco (aditivo, sem mexer em RLS): `circuit_big_event_parts` ganha `speaker_congregation text`, `time_mode text default 'auto'`; `circuit_big_events` ganha `start_time text`. A coluna existente `instructions` passa a guardar as informações individuais; `part_type_label` guarda o tipo (incluindo texto de "Outro").
- `invite.ts`: `buildInviteText` inclui congregação, `instructions` e congregação do próximo orador; nova função pura `recomputeTimes(start, parts)` (auto soma, manual reancora).
- `BigEvents.tsx`: novo `PartEditorDialog`, menu ⋮ por parte (editar/mover/excluir), campo início + ↻, filtros, duplicar evento; congregação auto via lista `elders`.
- Página pública `/confirmar/$token` e `confirm.functions.ts`: sem mudança de regras; apenas exibem a congregação se presente.
- Testes em `big-events.test.ts`: recálculo de horários (auto/manual), convite com congregação e info individual, próximo orador com congregação. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
