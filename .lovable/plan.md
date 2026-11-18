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
│ Presidência e comentários        │
│   iniciais e finais — João       │
│ Cântico 77 e oração — Paulo      │
│ Joias espirituais ...... Ana     │
│ Iniciando conversas .... Lucia.. │
│ (sem linhas "Conselho")          │
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
4. **Presidência + Comentários iniciais + Comentários finais** viram uma linha só: "Presidência e comentários" com o nome do presidente; as linhas separadas de comentários somem do Quadro.

Se o conteúdo não couber em uma folha, o Serviço de Campo continua indo para a segunda página, como hoje.

## Detalhes técnicos
- `board-program-export.ts`: selecionar `theme, opening_prayer, closing_prayer` em `pioneer_meetings`/`elders_servants_meetings` e `closing_prayer` em `field_meetings`.
- `board-program.ts`: `BoardRenderOptions` ganha `specialThemes`, `specialPrayers`, `fieldPrayer`; `specials` ganha `theme?`, `prayers?`; `field` ganha `prayer?`. Remover push de "Conselho" (o relógio ainda soma os minutos do conselho para manter os horários certos). Partes `kind === "comments"` são omitidas e o rótulo da presidência vira "Presidência e comentários". Render de especiais em bloco de largura total entre a programação e o campo; altura calculada com as linhas extras.
- Painel do diálogo existente ganha os novos interruptores (localStorage, mesma chave de prefs).
- Atualizar `board-program.test.ts`: sem "Conselho", sem linhas de comentários, horários seguintes preservados, tema/orações só quando ativados.
