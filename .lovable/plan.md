# Plano: Estrela nas notas, Reunião (conselho, oradores, Terça da visita) e Quadro de anúncios

## (01) Leitura da Bíblia: estrela nas listas e ao criar

Hoje a ⭐ só aparece dentro do cartão da leitura da Reunião. Ela passa a aparecer também:
- ao lado de cada nota em "Anotações de leitura" e "Pontos altos";
- no topo da tela ao criar ou editar uma dessas notas.

```text
┌───────────────────────────┐
│ ‹  Pontos altos        ＋ │
├───────────────────────────┤
│ Ezequiel 13:3          ☆ │
│ Falsos profetas…          │
├───────────────────────────┤
│ Ezequiel 14:14         ★ │ ← vai para "Para comentar"
│ Noé, Daniel e Jó…         │
└───────────────────────────┘
┌───────────────────────────┐
│ ✕  Nova anotação   ☆  ✓  │ ← estrela ao criar
│ Texto: Ez 14:14           │
│ ______________________    │
└───────────────────────────┘
```
É a mesma ⭐ que já existe (mesmo dado). Marcar em qualquer lugar mostra a nota no "Para comentar" e no cartão do Início.

## (02) Controle de tempo da reunião

### (02.1) Conselho por designação + minimizar
- Ao tocar numa parte: nova opção "☐ Terá conselho" (padrão 1 min, ajustável).
- Com conselho marcado, o controle ganha um segundo tempo logo após a parte: "Conselho · 1 min".
- O conselho não tem campo de orador (quem dá é o presidente).
- Botão — no topo do controle minimiza para a bolinha/boia; tocar nela volta. O tempo não para.

```text
┌───────────────────────────┐
│ — Controle    19:52    ✕  │
├───────────────────────────┤
│ 4. Iniciando conversas    │
│    03:00 / 03:00   ▶      │
│ ↳ Conselho  01:00         │ ← tempo próprio
│ 5. Cultivando o interesse │
└───────────────────────────┘
```

### (02.2) Oradores: importar ou colar
No ⋯ da semana, "Oradores": 1) importar arquivo (como Grandes Eventos), 2) colar/escrever os nomes, um por linha, em ordem.
Regras do preenchimento automático:
- Cânticos sozinhos não recebem nome.
- "Cântico e oração" recebe nome.
- "Comentários iniciais" e "Comentários finais" usam o mesmo nome (uma linha só).
- Todas as outras partes recebem um nome, em ordem.
- Dois nomes na mesma linha ("Lucia Nunes e Fernanda Abreu" ou "Lucia Nunes/Fernanda Abreu") contam como uma parte de demonstração e são aceitos juntos, mostrados como "Lucia Nunes / Fernanda Abreu".
- Antes de salvar, mostra uma prévia parte → nome para conferir.

```text
┌───────────────────────────┐
│ ✕  Oradores        Aplicar│
├───────────────────────────┤
│ [Importar arquivo]        │
│ Ou cole, um por linha:    │
│ ┌───────────────────────┐ │
│ │João (presidente)      │ │
│ │Pedro (oração)         │ │
│ │…                      │ │
│ └───────────────────────┘ │
│ Prévia:                   │
│ Coment. iniciais/finais João│
│ Cântico e oração   Pedro  │
└───────────────────────────┘
```

### (02.3) Semana da visita
Quando a data da reunião cair numa semana de visita do programa:
- "Estudo bíblico de congregação" é trocado pelo tema do discurso de serviço de terça-feira do Programa da visita (orador: o superintendente, 30 min).
- "Comentários finais" passa para antes desse discurso.
- O cântico final passa a ser o cântico de terça do Programa da visita.
Nada é apagado: fora da semana de visita a ordem normal continua.

### (02.4) Exportar e importar semanas
No ⋯ de "‹ Semanas": "Exportar semanas" (escolhe quais) e "Importar semanas", igual aos programas dos Grandes Eventos.
- O arquivo leva temas, minutos, ordem, seções e conselhos, mas sem nomes de oradores.
- Quem importa: data e hora seguem a própria conta (dia e horário da reunião já usados nela, senão terça 19:30); a troca da semana de visita (02.3) usa o Programa da visita de quem importa.
- Semana que já existe: só é substituída se marcar, como na importação da apostila.

## (03) "Programa da Semana da Visita" para o quadro de anúncios — É POSSÍVEL

Análise franca: dá para fazer em uma página A4 com quase tudo vindo do app (datas, congregação, nome do SC, reunião de terça da nova função, temas e cânticos do Programa da visita, reuniões especiais, saídas de campo). O que não existir no app sai como linha em branco para escrever à mão. Inspirado no modelo, não cópia: linha do tempo à esquerda com designações, faixas de cor por seção usando as cores do app.

Botão no Início, logo abaixo de "Relatório executivo": "Quadro de anúncios". Gera PDF (pdf-lib, padrão do app) e abre a opção de compartilhar/imprimir.

```text
┌──────────── A4 ────────────┐
│ 17–22 nov  SEMANA DA VISITA│
│            Wanderson R.    │
│ Congregação X              │
│ ○ Meio de semana · Ter 19:30│
│  João   Presidência        │
│  ▬ Tesouros  10m 1. …      │
│  ▬ Ministério 3m 4. …      │
│  ▬ Vida cristã 15m 7. …    │
│  SC     30m Discurso serviço│
│ ○ Fim de semana            │
│ ○ Reuniões especiais       │
│ ┌ SERVIÇO DE CAMPO ───────┐│
│ │Dia │Manhã hora/local│Tarde││
│ └─────────────────────────┘│
└────────────────────────────┘
```

## Detalhes técnicos
- Novo `meeting-share.ts` (puro): arquivo .json versionado `{kind:"visitasc-meeting-weeks",version:1}`, remove `assigned`, limite de tamanho, ids novos ao importar, reaproveita `mergeImported`; testes (sem oradores, ids novos, recusa inválido).
- Estrela: reaproveita `star` dos highlights (bible-tracks); botão nas listas do GuestWorkspace/HighlightsDrawer e no FocusEditor. Sem mudança de formato.
- meeting-store: `MeetingPart` ganha `counsel?: number` (minutos, opcional, sanitizado). Timer gera parte extra "counsel" após a parte. Minimizar reusa a boia do event-timer.
- Novo `meeting-speakers.ts` (puro): `assignSpeakers(parts, lines)` com as regras acima; uma linha = uma parte, separadores " e " e "/" viram par de demonstração; conselho fica fora da contagem; testes.
- Novo `visit-week-meeting.ts` (puro): `applyVisitWeek(program, visit)` lê service_talk_theme e final_song do programa da visita; testes de ordem e cântico.
- PDF: `board-program-pdf.ts` com pdf-lib (createJsPdfCompat), uma página, fontes do app; botão no dashboard abaixo de executiveReport.
- Testes para as regras de oradores, conselho e semana de visita; `tsc --noEmit` limpo.
