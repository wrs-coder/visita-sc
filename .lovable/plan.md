# Quadro de anúncios: dois modelos + presidente e oração final automáticos

## 1. Escolha do modelo no celular

Ao tocar em "Quadro de anúncios", o painel ganha um seletor no topo (estilo One UI).

```text
┌──────────────────────────────┐
│ ▬▬▬                          │
│ Quadro de anúncios           │
│ ┌────────────┬─────────────┐ │
│ │■ Completo  │ Simplificado│ │
│ └────────────┴─────────────┘ │
│ Itens opcionais              │
│ Frase do topo (Isa 54:13) [●]│
│ Frase do rodapé (Luc 2:10)[●]│
│ Temas especiais           [●]│
│ Orações especiais         [●]│
│ Oração do campo           [●]│
│ Campo detalhado (só Compl.)[ ]│
│ ┌──────────────────────────┐ │
│ │      Gerar PDF           │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```
O aparelho guarda o último modelo escolhido.

## 2. Modelo Completo (igual ao Modelo 1)

- Meio de semana: todas as partes do controle de tempo, com o nome de cada orador ao lado (das designações da apostila e do Programa da visita): presidente nos comentários, oradores das partes, estudantes "Felicia / Rosy", oração inicial e final.
- Fim de semana: só horários e temas, **sem nomes**.
- Reuniões Especiais: fica como está.
- Serviço de Campo: novo interruptor **"Campo detalhado"**. Desligado = tabela atual (Dia | Manhã | Local | Tarde | Local). Ligado = tabela do Modelo 2 (Manhã/Tarde, cada saída com dia, horário, local, modalidade, território e oração).
- Espaço: com 5 a 7 saídas cabe bem; o vão que sobra no Modelo 1 (~3 cm) mais a redução automática de letra absorvem. Com muitas saídas (10+), a letra pode ficar pequena (mínimo ~7pt); nesse caso o painel avisa "Ficou apertado — use o Simplificado".
- Tudo continua cabendo em uma folha.

## 3. Modelo Simplificado (igual ao Modelo 2)

```text
┌──────────── A4 ─────────────┐
│        PROGRAMAÇÃO          │
│ VISITA DO SUPERINTENDENTE   │
│ "...Todos os seus filhos.." │
│▓▓ REUNIÃO MEIO DE SEMANA ▓▓▓│
│░░ DISCURSO DE SERVIÇO ░░░░░░│
│  Sinta alegria na obra...   │
│▓▓ REUNIÃO DO FIM DE SEMANA ▓│
│░░ DISCURSO PÚBLICO ░░░░░░░░░│
│  Você vai ser corajoso...   │
│░░ DISCURSO DE SERVIÇO FINAL │
│  Avancemos à madureza...    │
│░░ ♫ CÂNTICOS ♫ ░░░░░░░░░░░░░│
│ Terça(Final):79 Fds(I):56   │
│ Fds(Final):156              │
│▓▓ REUNIÕES ESPECIAIS ▓▓▓▓▓▓▓│
│ PIONEIROS     │ ANCIÃOS     │
│ Local / Dia e hora / Tema   │
│ Oração inicial / final      │
│▓▓ SERVIÇO DE CAMPO ▓▓▓▓▓▓▓▓▓│
│░░ PERÍODO DA MANHÃ ░░░░░░░░░│
│ Dia·Hora·Local │ Modalidade │
│                │ Território │
│                │ Oração     │
│░░ PERÍODO DA TARDE ░░░░░░░░░│
│ (mesma tabela)              │
└─────────────────────────────┘
```
- Meio e fim de semana: só temas dos discursos e números dos cânticos.
- Reuniões especiais: todos os dados da Agenda (local, dia/hora, tema, orações), lado a lado.
- Campo (destaque): uma linha por saída com dia, horário, local, modalidade, nº do território e oração, separado Manhã/Tarde, lendo a mesma fonte da Agenda do dashboard.
- Mantém as frases opcionais. Se não couber em 1 folha, reduz letra/espaços automaticamente.

## 4. Apostila preenche presidente e oração final

Ao importar a apostila (como já faz com o discurso de serviço e o cântico final), na semana da visita:
- "Comentários iniciais" (e finais) recebem o **Presidente** do Programa da visita › Meio de semana.
- "Cântico e oração" final recebe a **Oração final** do meio de semana.
Só preenche se a parte estiver vazia — nunca apaga um nome já digitado. Nada é gravado no programa salvo (aplicado na hora de mostrar, como hoje).

## Sugestões
- Mostrar no painel um aviso "Faltam: presidente, oração final" quando houver campos vazios antes de gerar.
- Nome do arquivo com o modelo: "Quadro-completo-17-22-nov.pdf".

## Detalhes técnicos
- `use-visit-week-info.ts`: selecionar também `chairman, closing_prayer` de midweek_meetings; `VisitWeekInfo` ganha `chairman`, `closingPrayer`.
- `visit-week-meeting.ts` `applyVisitWeek`: preencher `assigned` das partes `comments` vazias com chairman e da última `song`+oração com closingPrayer. Teste novo em meeting-rules.test.ts.
- `board-program.ts`: `BoardTemplate = "full" | "simple"`; modelo completo omite nomes do fim de semana; novo `renderSimpleBoard` (pdf-lib, tokens de cor existentes) com campo por linha (modalidade, território, oração) a partir dos field_meetings via readWithMirror.
- Fim de semana no simplificado: public_talk_theme (weekend_meetings), discurso final do SC e cânticos de visit_template_overrides/extras.
- `BoardProgramSheet.tsx`: seletor segmentado, localStorage `board.template`.
- Testes em board-program.test.ts para: fim de semana sem nomes no completo; campo com modalidade/território/oração no simplificado.
