# Controle de tempo da Reunião de Meio de Semana (revisado)

## (01) Importar o zip com várias semanas: sim, dá

Seu zip tem 8 arquivos .rtf, um para cada semana de janeiro e fevereiro de 2027. O app já abre arquivos zip no próprio aparelho (usa isso no backup e na importação do JW Library). Então dá para:

- escolher o **.zip** ou um **.rtf** solto;
- o app lê todas as semanas de uma vez e mostra a lista;
- você confirma, e cada semana fica guardada pela data dela. Na terça de cada semana, o programa já está pronto.

Se uma semana já estiver guardada, ela é substituída só se você marcar.

```text
┌───────────────────────────┐
│ Importar apostila         │
├───────────────────────────┤
│ 8 semanas encontradas     │
│ ☑ 4–10 jan    13 partes   │
│ ☑ 11–17 jan   13 partes   │
│ ☑ 18–24 jan   12 partes   │
│ ☐ 25–31 jan   já existe   │
│  …                        │
│ [ Cancelar ] [ Importar ] │
└───────────────────────────┘
```

## (02) Onde fica: botão ⏱ solto no topo, ao lado de Recados

O botão não fica preso ao compromisso de terça. Assim, se o dia ou a hora da reunião mudar no futuro, nada quebra. Ele fica no topo do Início, ao lado do ícone de Recados, e vale para qualquer dia.

```text
┌───────────────────────────┐
│ VisitaSC        ⏱  💬  ☰ │  ← ⏱ novo, ao lado de Recados
├───────────────────────────┤
│ (●Agenda)(Esboços)(Visita)│
│ (Pastoreio)               │
│  … Início igual a hoje …  │
└───────────────────────────┘
```

- Ao tocar no ⏱, abre a reunião da semana atual. Se a semana ainda não tiver programa, abre a lista de reuniões.
- As 4 telas do Início não mudam.

**Vai pesar no Início? Não.** O Início ganha só o ícone. A tela da reunião, o leitor da apostila e o leitor do zip só carregam quando você toca no ⏱, do mesmo jeito que o editor de esboços já carrega só quando é aberto. Os programas ficam no aparelho e não usam a internet nem a nuvem.

## (03) Onde editar, criar e renomear (igual aos Grandes Eventos)

A tela da reunião tem dois níveis, como nos Grandes Eventos:

**1. Lista de reuniões**: o botão "‹ Semanas" no topo da tela da reunião abre a lista de todas as semanas guardadas.

```text
┌───────────────────────────┐
│ ‹  Reuniões         ＋  ⋯ │
├───────────────────────────┤
│ ┌───────────────────────┐ │
│ │ Ter 12 jan · 19:30    │ │
│ │ Ezequiel 13–14   ⋯    │ │
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ Ter 19 jan · 19:30    │ │
│ │ Ezequiel 15–16   ⋯    │ │
│ └───────────────────────┘ │
│  …                        │
└───────────────────────────┘
 ＋ = Nova reunião (em branco)
 ⋯ topo = Importar apostila (.zip/.rtf)
 ⋯ cartão = Renomear · Mudar data/hora
            · Duplicar · Apagar
```

**2. Programa de uma reunião**: toque no cartão para abrir o programa. Toque numa parte para editar tema, tempo e quem faz. O ＋ adiciona uma parte, e a alça ⋮⋮ arrasta para mudar a ordem, como nas partes dos Grandes Eventos.

```text
┌───────────────────────────┐
│ ‹ Semanas  Ter 12 jan  ✎  │
├───────────────────────────┤
│ Início [19:30]            │
│ ⋮⋮ 19:36 1. Jeová… 10min ›│
│ ⋮⋮ 19:46 2. Joias  10min ›│
│ ⋮⋮ 19:56 3. Leitura 4min ›│
│        [ ＋ Parte ]        │
│ [ ▶  Iniciar controle   ] │
└───────────────────────────┘
```

**Caminho:** toque no ⏱ do topo para abrir a reunião da semana. Dali, "‹ Semanas" leva à lista, onde dá para criar, renomear, duplicar e apagar.

## (04) O controle não para ao trocar de tela ou minimizar o app

O cronômetro dos Grandes Eventos não conta "segundo a segundo" na memória. Ele guarda a hora real em que cada parte começou. Se você minimizar o app, trocar de tela ou até fechar e abrir de novo, o tempo continua certo. Ao voltar, a tela mostra o tempo exato que passou. A reunião usa o mesmo cronômetro, então tem o mesmo comportamento. Vou incluir um teste automático para essa regra: "minimizou 5 min, voltou e a parte mostra +5 min".

## (05) Cartão "Para comentar" na tela Esboços do Início

Sim, dá e vale a pena. O cartão lê os mesmos pontos altos da leitura da reunião, que você já marca em Estudo e Anotações. Nada é copiado.

```text
┌───────────────────────────┐
│ Agenda (●Esboços) Visita  │
├───────────────────────────┤
│ ┌───────────────────────┐ │
│ │ 💬 Para comentar (3)  │ │
│ │ Ez 13:3 — Profetas…   │ │
│ │ Ez 14:14 ★ Noé, Dan…  │ │
│ │ [ Modo comentário › ] │ │
│ └───────────────────────┘ │
│  … cartões de esboços …   │
└───────────────────────────┘
```

- Mostra até 3 itens. "Modo comentário" abre a mesma tela de comentários que já existe.
- Se não houver nada para comentar, o cartão não aparece, para não ocupar espaço.

## (06) Tela cheia do Início com cronômetro flutuante: foi erro meu

Conferi: na correção anterior, troquei por engano o cronômetro da Tela cheia da anotação do Início pela boia flutuante. Eu achei que aquela tela era um Modo Esboço. Vou voltar exatamente ao cronômetro de antes e não mudo mais nada nessa tela.

## Detalhes técnicos

- `src/lib/meeting/mwb-import.ts` (puro e testado): usa `rtfToText` e separa semanas pelo cabeçalho "D a D de Mês" ou pelo arquivo. Lê partes `N. Tema (X min)`, cânticos, comentários e seções. O zip é lido com o JSZip que já existe no app, com limites de tamanho, de quantidade de arquivos e de partes. Os testes usam as 8 semanas do zip como amostra.
- Guardado no aparelho: `meeting.program.<userId>.<segunda>` em localStorage. O cronômetro reaproveita `loadTimer/saveTimer` com o id `meeting-<segunda>`.
- Botão ⏱ no cabeçalho do dashboard, ao lado de `CoupleMessagesButton`, só para o superintendente. A tela é carregada com React.lazy, então nada entra no carregamento inicial. A Agenda não muda.
- `MeetingTimerSheet` é uma nova tela por cima e usa `EventTimerFocus` sem mudanças. Os Grandes Eventos não são alterados.
- Edição de partes: uma folha simples (tema, minutos, designado), reordenação com o mesmo padrão de arrastar já usado, e o horário de cada parte recalculado a partir do início.
- (05) Cartão `ToCommentDashboardCard`: usa `commentList` de `bible-tracks.ts` sobre o workspace local `user.<userId>`, `CommentMode` de `BibleTrackExtras` e carregamento sob demanda.
- (06) `FieldNoteFullscreenDialog.tsx`: volta a usar `<OutlineTimer variant="fullscreen" />`, como na versão anterior.
- Textos em pt/en/es, uma regra no AGENTS.md, testes passando e `tsc --noEmit` limpo.
