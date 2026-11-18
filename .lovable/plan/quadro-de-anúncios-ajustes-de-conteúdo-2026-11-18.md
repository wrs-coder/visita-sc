# Quadro de anúncios — ajustes de conteúdo

Todas as informações pedidas **já são digitadas no app** (abas Pioneiros, Anciãos e Campo do Programa da visita). Nada novo para digitar; o Quadro só passa a lê-las. Nenhuma mudança no banco de dados.

## 1. Painel ao tocar "Quadro de anúncios" (celular)

```text
┌──────────────────────────────┐
│ ▬▬                           │
│ Quadro de anúncios           │
│                              │
│ FRASES                       │
│ Isaías 54:13 no topo    [●━] │
│ Lucas 2:10 no rodapé    [●━] │
│                              │
│ REUNIÕES ESPECIAIS           │
│ Tema dos pioneiros      [●━] │
│ Tema anciãos e servos   [●━] │
│ Orações (pion./anciãos) [●━] │
│                              │
│ SERVIÇO DE CAMPO             │
│ Oração do campo         [●━] │
│                              │
│ [        Gerar PDF         ] │
└──────────────────────────────┘
```
Escolhas salvas no aparelho, como as frases.

## 2. Folha A4 (nova ordem)

```text
┌─────────────── A4 ───────────────┐
│ ███ faixa azul (data/congreg.) ██│
│   "...Todos os seus filhos..."   │
│                                  │
│ PROGRAMAÇÃO DAS REUNIÕES         │
│ Meio de semana  | Fim de semana  │
│ Cântico 77 e oração — Paulo      │
│ Comentários iniciais (1) — João  │
│ Joias espirituais ...... Ana     │
│ Iniciando conversas .... Lucia.. │
│ (sem linhas "Conselho")          │
│ Comentários finais (3) — João    │
│ Discurso de serviço ... SC       │
│                                  │
│ REUNIÕES ESPECIAIS  (tópico      │
│ próprio, largura total)          │
│ Horário │ Reunião / Tema │ Local │
│ Sáb 10:30│Pioneiros       │Salão │
│          │"Tema..."       │      │
│          │Oração: A / B   │      │
│ Sex 19:00│Anciãos e servos│Salão │
│          │"Tema..."       │      │
│          │Oração: C / D   │      │
│                                  │
│ SERVIÇO DE CAMPO                 │
│ Dia │ Manhã │ Tarde │ Oração     │
│ Qua │ 09:00 │ 15:00 │ Fulano     │
│                                  │
│   frase Lucas 2:10 · emitido em  │
└──────────────────────────────────┘
```

### O que muda
1. **Reuniões Especiais** saem da coluna da programação e viram um tópico separado, igual ao Serviço de Campo, com Horário | Reunião | Local.
2. **Conselho** deixa de aparecer no Quadro (continua normal no controle de tempo).
3. **Opcionais**: tema e orações (inicial / final) das reuniões com pioneiros e com anciãos e servos, e oração do campo (o app só guarda a oração final do campo; ela aparece numa coluna "Oração"). Campo vazio = linha não aparece.
4. **Presidência**: a linha "Presidência" some do meio de semana. Comentários iniciais e finais ficam, com seu tempo e o nome do presidente (eles já fazem esse papel). Se a semana não tiver partes de comentários, a linha Presidência volta como reserva para o nome não sumir.
5. **Sempre uma folha só**, incluindo o Serviço de Campo. Se o conteúdo for grande, o app reduz aos poucos espaços e letra (até um mínimo legível) até caber; nunca cria segunda página.

## Detalhes técnicos
- `board-program-export.ts`: selecionar `theme, opening_prayer, closing_prayer` em `pioneer_meetings`/`elders_servants_meetings` e `closing_prayer` em `field_meetings`.
- `board-program.ts`: `BoardRenderOptions` ganha `specialThemes`, `specialPrayers`, `fieldPrayer`; `specials` ganha `theme?`, `prayers?`; `field` ganha `prayer?`. Remover push de "Conselho" (o relógio ainda soma os minutos do conselho para manter os horários certos). Linha "Presidência" do meio de semana só é incluída quando não há partes `kind === "comments"`; comentários recebem o presidente quando `assigned` vazio. Render de especiais em bloco de largura total entre a programação e o campo; altura calculada com as linhas extras.
- Ajuste para uma página: calcular altura total com fator de escala (fonte, altura de linha, espaçamentos) e reduzir em passos de 5% até caber, mínimo ~7 pt; remover a quebra para segunda página.
- Painel do diálogo existente ganha os novos interruptores (localStorage, mesma chave de prefs).
- Atualizar `board-program.test.ts`: sem "Conselho", comentários presentes e sem linha Presidência, sempre 1 página com semana cheia, horários seguintes preservados, tema/orações só quando ativados.
