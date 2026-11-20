# Pauta: dia/horário próprio + seletor de congregação nas Notas privadas

## 1. Dia e horário da pauta

Hoje a pauta já mostra o dia/horário vindo de "Reunião anciãos e servos", mas não dá para trocar só na pauta.

Novo: no cartão "Oração inicial … Tempo total" (só o SC edita), uma linha "Dia e horário":

```text
┌──────────────────────────────┐
│ Oração inicial  [ João     ] │
│ Oração final    [ Pedro    ] │
│ ──────────────────────────── │
│ Dia e horário                │
│ ( Da agenda )( Manual )      │
│ Ter, 24/11 · 19:30  (agenda) │
│                              │
│ — se Manual —                │
│ [ 24/11/2026 ] [ 20:00 ]     │
│ Só vale para esta pauta.     │
│ ──────────────────────────── │
│ Prazo p/ anciãos  [ ...  ]   │
│ Tempo total        1h 30min  │
└──────────────────────────────┘
```

- "Da agenda" (padrão): segue a agenda, como hoje — se a agenda mudar, a pauta acompanha.
- "Manual": vale só na pauta (cabeçalho, tela cheia, cartão do Início, PDF e horários de cada tópico). A aba "Reuniões anciãos e servos" não é alterada.
- Voltar para "Da agenda" apaga o horário manual.

## 2. Seletor de congregação nas Notas privadas

Volta como uma pílula discreta no topo; continua abrindo na congregação ativa.

```text
┌──────────────────────────────┐
│ Notas privadas               │
│ ( Central ⌄ )                │
│ ──────────────────────────── │
│ ...notas...                  │
└──────────────────────────────┘
```

Tocar abre a lista das congregações; a escolha fica lembrada no aparelho e não muda a congregação ativa do app.

## Detalhes técnicos
- `AgendaPayload` ganha `meetingAtOverride: string | null` (opcional; o que falta = null, por isso pautas antigas e o app da Play Store continuam funcionando). Normalização e merge seguem `prayersPerm`.
- Novo helper `effectiveMeetingAt(p, a) = p.meetingAtOverride ?? a.meetingAt`, usado em ElderAgendaView, Fullscreen, DashboardCard, GuestElderAgenda e agenda-pdf (em vez de `auto.meetingAt`).
- Notas: `<Select>` com `congs` / `setCongId` em `_app.notas.tsx`, salvo em `NOTAS_CONG_KEY`; o efeito da congregação ativa só vale quando nada foi salvo.
- Textos novos em pt/en/es; testes de normalização/override; tsc + toda a bateria de testes.
