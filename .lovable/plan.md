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

## Detalhes técnicos

- `src/lib/meeting/mwb-import.ts` (puro e testado): usa `rtfToText` e separa semanas pelo cabeçalho "D a D de Mês" ou pelo arquivo. Lê partes `N. Tema (X min)`, cânticos, comentários e seções. O zip é lido com o JSZip que já existe no app, com limites de tamanho, de quantidade de arquivos e de partes. Os testes usam as 8 semanas do zip como amostra.
- Guardado no aparelho: `meeting.program.<userId>.<segunda>` em localStorage. O cronômetro reaproveita `loadTimer/saveTimer` com o id `meeting-<segunda>`.
- Botão ⏱ no cabeçalho do dashboard, ao lado de `CoupleMessagesButton`, só para o superintendente. A tela é carregada com React.lazy, então nada entra no carregamento inicial. A Agenda não muda.
- `MeetingTimerSheet` é uma nova tela por cima e usa `EventTimerFocus` sem mudanças. Os Grandes Eventos não são alterados.
- Edição de partes: uma folha simples (tema, minutos, designado), reordenação com o mesmo padrão de arrastar já usado, e o horário de cada parte recalculado a partir do início.
- Textos em pt/en/es, uma regra no AGENTS.md, testes passando e `tsc --noEmit` limpo.
