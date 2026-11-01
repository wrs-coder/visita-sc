# Agenda: temas abaixo do nome da reunião

## O que muda
O título do cartão de reunião passa a mostrar só o tipo (ex.: "Fim de Semana"). Todos os temas descem para as linhas de baixo, com a mesma letra pequena e cinza das outras informações.

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

## Depois
```text
┌─────────────────────────────────────┐
│ 09:00  ⌂ Fim de Semana              │
│          📍 Salão do Reino          │
│          1) Quem realmente governa..│
│          2) Continue vigilante      │
│          Presidente: João Lima      │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 19:30  ⌂ Meio de Semana             │
│          📍 Salão do Reino          │
│          Tema: Sejam vigilantes     │
│          Presidente: Carlos Souza   │
│          Oração final: Pedro Alves  │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ 08:00  ⌂ Pioneiros                  │
│          Tema: Alegria no ministério│
│          Oração inicial: ...        │
└─────────────────────────────────────┘
```

## Regras
- Vale para as 4 reuniões: Meio de Semana, Fim de Semana, Pioneiros e Anciãos e Servos.
- Fim de semana: os dois discursos numerados (1 e 2) + presidente.
- Meio de semana / Pioneiros / Anciãos: "Tema: ..." primeiro, depois presidente/orações.
- Até 3 linhas por reunião (hoje são 2), cada uma cortada em 1 linha com "…" se for longa.
- Tela de detalhes (ao tocar no cartão) continua igual.
- Outros eventos (campo, refeição, transporte) não mudam.

## Detalhes técnicos
- `src/routes/_app.dashboard.tsx`: em `meetingsWeek.map`, `title: meetingLabels[mt.kind]` (sem `· theme`).
- `meetingLines`: incluir `["Tema", mt.theme]` como primeira linha em midweek/pioneer/elders; limite de 3 linhas só para reuniões (parâmetro no `brief`, demais continuam com 2).
- Sem mudança de banco, de dados ou de tradução de chaves existentes.
