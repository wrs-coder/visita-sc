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

## (02) Onde colocar: você tem razão

Eu sugeri o Programa da visita porque a reunião da visita faz parte da semana da visita. Mas, como você explicou, lá já tem 5 abas, e o controle é só da reunião de meio de semana. Sua ideia é melhor. **Recomendo a Agenda**, sem criar uma 5ª tela no Início:

- No dia da reunião (terça), o compromisso **"Reunião"** da Agenda ganha um botão **⏱ Controle de tempo**.
- Esse botão abre a tela da reunião da semana: programa, hora de início, importar e iniciar.
- Assim o Início continua com 4 telas, e o controle aparece exatamente onde e quando você precisa.

```text
┌───────────────────────────┐
│ Agenda   (Hoje)(Semana)   │
├───────────────────────────┤
│ Terça, 12 jan             │
│ ┌───────────────────────┐ │
│ │ 🚗 Transporte   18:45 │ │
│ └───────────────────────┘ │
│ ┌───────────────────────┐ │
│ │ 🏛 Reunião      19:30 │ │
│ │ Cong. Central         │ │
│ │ [ ⏱ Controle de tempo]│ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

Tela da reunião, que abre por cima:

```text
┌───────────────────────────┐
│ ✕  Reunião · 12 jan   ⋯   │
├───────────────────────────┤
│ Início  [19:30]           │
│ 19:30 Cântico 39 e oração │
│ ── Tesouros ───────────── │
│ 19:36 1. Jeová valo… 10min│
│ 19:56 3. Leitura      4min│
│ ── Faça seu melhor ────── │
│  …                        │
│ 20:50 Comentários f.  3min│
│                           │
│ [ ▶  Iniciar controle   ] │
└───────────────────────────┘
  ⋯ = Importar apostila (.zip/.rtf)
```

**Iniciar controle** abre a mesma tela de foco dos Grandes Eventos: tempo da parte, pausar, próxima e atraso total.

Se essa semana ainda não tiver programa, a tela mostra **"Importar apostila"** no centro.

**Alternativa**, se preferir: uma sub-aba "Reunião" entre Agenda e Esboços. Funciona, mas fica no Início todos os dias, mesmo quando não é dia de reunião.

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

**Caminhos para chegar lá:**
- na terça, pelo botão ⏱ do compromisso "Reunião" da Agenda, que abre direto a reunião da semana;
- em qualquer dia, pela Agenda › menu ⋯ › "Reuniões", que abre a lista.

## Detalhes técnicos

- `src/lib/meeting/mwb-import.ts` (puro e testado): usa `rtfToText` e separa semanas pelo cabeçalho "D a D de Mês" ou pelo arquivo. Lê partes `N. Tema (X min)`, cânticos, comentários e seções. O zip é lido com o JSZip que já existe no app, com limites de tamanho, de quantidade de arquivos e de partes. Os testes usam as 8 semanas do zip como amostra.
- Guardado no aparelho: `meeting.program.<userId>.<segunda>` em localStorage. O cronômetro reaproveita `loadTimer/saveTimer` com o id `meeting-<segunda>`.
- A Agenda (`DayDetailsDialog` e o item de reunião do dia) só ganha o botão no item de reunião. Os dados e a lógica da Agenda não mudam.
- `MeetingTimerSheet` é uma nova tela por cima e usa `EventTimerFocus` sem mudanças. Os Grandes Eventos não são alterados.
- Edição de partes: uma folha simples (tema, minutos, designado), reordenação com o mesmo padrão de arrastar já usado, e o horário de cada parte recalculado a partir do início.
- Textos em pt/en/es, uma regra no AGENTS.md, testes passando e `tsc --noEmit` limpo.
