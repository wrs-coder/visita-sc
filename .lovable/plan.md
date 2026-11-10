# Grandes Eventos — importação .rtf do jw.org, tipos, participações, programa e cartas

Nada muda no banco de dados. Eventos já criados continuam funcionando; as regras novas valem para novas importações (e o que for editado à mão).

## (01) Numeração dos esboços
Não recebem número: "Música", "Vídeo musical", "Cântico", "Cântico e oração", "Cântico Nº e oração", "Cântico Nº e anúncios" e o título "Série de discursos:".
Todas as outras partes — inclusive cada "•" da série — recebem 1, 2, 3… em ordem crescente, seguindo da manhã para a tarde. Oração e Presidente também ficam sem número.

## (02) Tipo marcado automaticamente
| Texto no tema | Tipo |
|---|---|
| Série de discursos / "•" | Simpósio |
| Resumo de A Sentinela / A Sentinela | A Sentinela |
| Discurso do Batismo / Batismo | Discurso Batismo |
| Discurso Público / para o público | Discurso Público |
| Experiências / Entrevista | Entrevistas |
| Qualquer outro tema com orador | Discurso |

## (03) Parte de Oração
Para cada "Cântico e oração" / "Cântico Nº e oração" o app cria logo abaixo uma parte "Oração", tipo **Oração**, mesmo horário do cântico, sem tempo (não empurra os horários seguintes) e sem número.

## (04) Presidente do programa
Acima de cada "Música" / "Vídeo musical" (normalmente manhã e tarde) o app cria "Presidente do programa", tipo **Presidência do programa**, horário 40 min antes da Música (ex.: Música 9:40 → Presidente 9:00), sem tempo e sem número.

## (05) Termos
No campo "Designado": "Orador" → **Ancião**, "Filial" → **Rep. da Filial**. O mesmo nome aparece nos convites, cartas e programa.

## (06) Participações adicionais
Em "Informações só deste convite", quatro caixinhas (pode marcar várias): Demonstração · Vídeos · Entrevista · Participação da Assistência. Aparecem no convite, na carta PDF, na lista Word, no Programa PDF e vão no arquivo para outro aparelho.

## (07) Editar nome do evento
O nome no topo do cartão do evento ganha um campo editável (com o lápis), igual à data e ao local.

## (08) Programa do evento em 1 página
Layout mais compacto e elegante: cabeçalho com faixa fina, duas seções (Manhã/Tarde), cada parte em 1–2 linhas, letra que se ajusta sozinha para caber sempre em uma única folha A4.

## (09) Três papéis timbrados
Em "Modelo de carta", escolher o cabeçalho: **Clássico** (o atual), **Formal** (nome à esquerda, circuito e contatos à direita, linha dupla fina) e **Sóbrio** (tudo centralizado em versalete, filete fino em cima e embaixo, rodapé discreto com contatos). Cores sóbrias, sem logotipos.

## Mockups

```text
Editar parte                         Cartão da parte (lista)
┌───────────────────────────┐        ┌───────────────────────────┐
│ Tema [Imite aqueles... ]  │        │ 09:00 Presidente do prog. │
│ Nº [3]   Tempo [  ] ⚠     │        │   Presidência · sem nº    │
│ Tipo                      │        │ 09:40 Música              │
│ (Discurso)(Simpósio)      │        │ 09:50 Cântico 12 e oração │
│ (A Sentinela)(Batismo)    │        │ 09:50 Oração · Oração     │
│ (Público)(Entrevistas)    │        │ 1  10:00 Discurso ...     │
│ (Oração)(Presidência)     │        │ 2  10:15 Série — Baraque  │
│ Designado                 │        │   ⚠ Falta inserir o tempo │
│ (Ancião)(SC)(Rep. Filial) │        │ ▼ Informações só deste... │
│ (—)                       │        │  ☑ Demonstração ☐ Vídeos  │
└───────────────────────────┘        │  ☐ Entrevista             │
                                     │  ☑ Participação Assist.   │
Modelo de carta                      │  [texto livre........]    │
┌───────────────────────────┐        └───────────────────────────┘
│ Papel timbrado            │
│ ┌─────┐ ┌─────┐ ┌─────┐   │        Programa PDF (1 página)
│ │═Nome│ │Nome │ │─────│   │        ┌───────────────────────────┐
│ │ ─── │ │ ═══ │ │ NOME│   │        │ ASSEMBLEIA DE CIRCUITO    │
│ └─────┘ └─────┘ └─────┘   │        │ 12/12 · Salão X ─────────│
│Clássico  Formal  Sóbrio   │        │ MANHÃ                     │
└───────────────────────────┘        │ 9:00 Presidente  · J.Silva│
                                     │ 10:00 1 Tema...  · Nome   │
                                     │   Demonstração · Vídeos   │
                                     │ TARDE ...                 │
                                     └───────────────────────────┘
```

## Detalhes técnicos
- `rtf-program-import.ts`: lista de partes sem número (regex), numeração sequencial em `outline_number`, `part_type_label` por regex (mesma tabela do .etim), inserção das partes Oração (`time_mode` manual, mesmo `part_time`, `duration_min` null) e Presidente (`part_time` −40 min, manual). O cálculo de duração automática ignora Oração/Presidente. Testes novos para cada regra (numeração, tipos, oração, presidente −40 min).
- `invite.ts` `PART_TYPES`: + "Oração", "Presidência do programa". Rótulos de `assigned_to` centralizados (speaker→Ancião, branch→Rep. da Filial) e usados em BigEvents, invite, letter-template, program-pdf. Valores gravados não mudam.
- Participações: guardadas em `talk_includes` (JSON já existente) como marcadores reservados `@extra:demo|videos|entrevista|assistencia`; helpers `readExtras/writeExtras` filtram esses marcadores de toda exibição dos "inclui". Sem mudança de esquema; `event-share-file.ts` já leva `talk_includes`.
- Nome do evento: `patchEvent(ev.id, { name })` no onBlur, limite 200.
- `program-pdf.ts`: medição prévia da altura e redução de escala (fonte/espaçamento) até caber em uma página.
- `letter-template.ts`: novo campo opcional `headerStyle: "classic" | "formal" | "sober"` (ausente = classic, cartas antigas iguais); `letter-render.ts` desenha os três cabeçalhos; sincroniza pelo mesmo modelo já salvo.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Sem aumento de versão.
