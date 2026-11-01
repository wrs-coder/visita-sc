# Agenda: temas abaixo do nome da reunião + expandir/recolher detalhes

## O que muda
1. O título do cartão de reunião mostra só o tipo (ex.: "Fim de Semana"). Os temas aparecem nas linhas de baixo, com a mesma letra pequena e cinza das outras informações.
2. Os cartões da agenda passam a mostrar 2 linhas de detalhes. Quando houver mais, aparece um botão "Mais detalhes ▾" para mostrar tudo e "Menos ▴" para recolher.

## Antes
```text
┌─────────────────────────────────────┐
│ 09:00  ⌂ Fim de Semana · Quem       │
│          realmente governa o mundo? │
│          📍 Salão do Reino          │
│          1) Quem realmente governa..│
│          2) Continue vigilante      │
└─────────────────────────────────────┘
```

## Depois (recolhido)
```text
┌─────────────────────────────────────┐
│ 09:00  ⌂ Fim de Semana              │
│          📍 Salão do Reino          │
│          1) Quem realmente governa  │
│             o mundo?                │
│          2) Continue vigilante      │
│          Mais detalhes ▾            │
└─────────────────────────────────────┘
```

## Depois (expandido)
```text
┌─────────────────────────────────────┐
│ 09:00  ⌂ Fim de Semana              │
│          📍 Salão do Reino          │
│          1) Quem realmente governa  │
│             o mundo?                │
│          2) Continue vigilante      │
│          Presidente: João Lima      │
│          Cântico inicial: 12        │
│          Cântico final: 45          │
│          Menos ▴                    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 19:30  ⌂ Meio de Semana             │
│          📍 Salão do Reino          │
│          Tema: Sejam vigilantes     │
│          Presidente: Carlos Souza   │
│          Mais detalhes ▾            │
└─────────────────────────────────────┘
```

## Regras
- Vale para as 4 reuniões: Meio de Semana, Fim de Semana, Pioneiros e Anciãos e Servos.
- Fim de semana: os dois discursos (1 e 2) primeiro, depois presidente, cânticos.
- Meio de semana / Pioneiros / Anciãos: "Tema: ..." primeiro, depois presidente, orações, cânticos.
- O expandir/recolher vale para todos os cartões da agenda (campo, refeição, transporte também), mostrando todas as informações disponíveis.
- Os temas não são mais cortados com "…": quebram em várias linhas.
- Tocar no botão "Mais detalhes" só abre/fecha; tocar no resto do cartão continua abrindo a tela de detalhes como hoje.
- Começa sempre recolhido; nenhuma informação salva muda.

## Detalhes técnicos
- `src/routes/_app.dashboard.tsx`: título da reunião = `meetingLabels[mt.kind]`.
- `meetingLines` inclui `["Tema", mt.theme]` em midweek/pioneer/elders e mais campos (cânticos, local, orações); `brief` deixa de cortar em 2 — a lista inteira vai em `lines`.
- Renderização: mostra `lines.slice(0,2)` e, com estado local por item (`Set` de ids expandidos), as restantes; botão separado (fora do `<button>` do cartão, para não aninhar botões), alvo de toque 44px, `aria-expanded`. Remove `line-clamp-1`, usa `break-words`.
- Sem mudança de banco ou de dados.
