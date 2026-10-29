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

## Forma do link e PIN (escolhida por evento)

```text
+-------- Novo evento / Importar -----+
| Como os oradores vão confirmar?     |
| (•) Link único + PIN                |
|     Um link para todos; cada orador |
|     digita seu PIN.                 |
| ( ) Link pessoal                    |
|     Cada orador recebe o seu link,  |
|     sem digitar PIN.                |
+-------------------------------------+
```

- Escolha feita ao criar/importar e alterável depois no evento (aviso: ao trocar, convites já enviados deixam de valer e precisam ser reenviados).
- Link pessoal: cada orador ganha um link próprio com código longo e imprevisível; PIN e "Novo PIN" dão lugar a "Novo link" (cancela o anterior). Convite e Word levam o link pessoal, sem PIN.
- Link único + PIN: funciona como hoje. Bloqueios contra tentativas valem nos dois modos.

Fica igual: bloqueios, página pública de confirmação, importação .etim.

## Detalhes técnicos

- Banco (aditivo, sem mexer em RLS): `circuit_big_event_parts` ganha `speaker_congregation text`, `time_mode text default 'auto'`, `personal_token uuid unique` (nulo no modo PIN); `circuit_big_events` ganha `start_time text` e `link_mode text default 'pin'` ('pin'|'personal'). A coluna existente `instructions` guarda as informações individuais; `part_type_label` guarda o tipo (incluindo texto de "Outro").
- `invite.ts`: `buildInviteText` inclui congregação, `instructions`, congregação do próximo orador e usa link pessoal sem PIN quando o modo for pessoal; nova função pura `recomputeTimes(start, parts)` (auto soma, manual reancora).
- `BigEvents.tsx`: novo `PartEditorDialog`, menu ⋮ por parte (editar/mover/excluir), campo início + ↻, filtros, duplicar evento, escolha do modo de link; congregação auto via lista `elders`.
- `confirm.functions.ts`: aceita token do evento + PIN, ou token pessoal sozinho (só se o evento estiver em modo pessoal); `/confirmar/$token` detecta o tipo e pula a tela de PIN; exibe a congregação.
- Testes em `big-events.test.ts`: recálculo de horários (auto/manual), convite com congregação e info individual, próximo orador com congregação. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
