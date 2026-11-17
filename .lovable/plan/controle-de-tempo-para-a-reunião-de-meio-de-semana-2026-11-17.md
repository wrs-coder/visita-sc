# Controle de tempo para a Reunião de Meio de Semana

## Análise franca: é possível e vale a pena?

**Sim, é possível — e com pouco peso para o app.** Motivos, conferidos no código:

- O cronômetro dos Grandes Eventos já é separado do resto: ele recebe uma lista de partes (tema, tempo, quem faz) e guarda tudo só no aparelho. Dá para reaproveitar o mesmo cronômetro, a mesma tela de foco e o relógio espelhado, sem escrever outro.
- Os arquivos que você mandou (apostila "Nossa Vida e Ministério Cristão") têm um formato fácil de ler: cada parte vem com número e tempo, ex.: `3. Leitura da Bíblia (4 min)`, `8. Estudo bíblico de congregação (30 min)`, `Comentários finais (3 min)`, cânticos e orações.
- **Atenção honesta:** o importador dos Grandes Eventos NÃO lê esse arquivo do jeito que está. Ele procura horários (`9:40 Música`), e a apostila tem duração em minutos. Preciso criar um leitor novo para a apostila (pequeno, testado), reaproveitando a parte que já limpa o arquivo RTF.
- Os horários de cada parte são calculados a partir da hora de início (ex.: 19:30), como já acontece nos Grandes Eventos.
- Nada vai para a nuvem e nada muda nas tabelas. Fica tudo no aparelho, então funciona sem internet e não deixa o app mais lento.

**Onde pode não valer a pena:** se você só usa isso na semana da visita, uma aba fixa no Início seria peso à toa. Por isso minha recomendação é diferente da sua ideia.

## Recomendação de lugar

Em vez de uma nova sub-aba no Início, que já tem 4 telas, coloque o cronômetro **dentro do Programa da visita**, numa nova pílula "Reunião". É lá que você está na semana da visita, e a reunião faz parte dela. No cartão "Visita" do Início entra só um atalho "⏱ Reunião", que aparece só na semana da visita.

```text
┌───────────────────────────┐
│ ←  Programa da visita     │
│ (Programa)(Pastoreio)     │
│ (Recomend.)(●Reunião)     │
├───────────────────────────┤
│ Semana 11–17 jan          │
│ Início  [19:30]  ▾        │
│                           │
│ 19:30 Cântico 39 e oração │
│ 19:35 Comentários   1 min │
│ ── Tesouros ───────────── │
│ 19:36 1. Jeová valoriza…  │
│                    10 min │
│ 19:46 2. Joias esp. 10 min│
│ 19:56 3. Leitura     4 min│
│ ── Faça seu melhor ────── │
│ 20:00 4. Iniciando…  3 min│
│  …                        │
│ ── Nossa vida cristã ──── │
│ 20:20 8. Estudo     30 min│
│ 20:50 Comentários f. 3 min│
│                           │
│ [ 📥 Importar apostila ]  │
│ [ ▶  Iniciar controle   ] │
└───────────────────────────┘
```

Ao tocar em **Iniciar controle**, abre a mesma tela de foco dos Grandes Eventos:

```text
┌───────────────────────────┐
│ ✕  Reunião · 11 jan       │
├───────────────────────────┤
│   3. Leitura da Bíblia    │
│                           │
│         03:12             │
│     de 04:00 · verde      │
│                           │
│  [⏸ Pausar] [⏭ Próxima]  │
│                           │
│ Programa: +0:45 atrasado  │
│ Termina ≈ 21:00           │
└───────────────────────────┘
```

**Importar apostila:** escolha o arquivo .rtf. O app lê as semanas que estão nele e pergunta qual semana usar. Antes de salvar, mostra uma revisão em que dá para mudar os tempos e o nome de quem faz cada parte.

```text
┌───────────────────────────┐
│ Importar apostila         │
├───────────────────────────┤
│ Semanas encontradas:      │
│ ○ 4–10 jan                │
│ ● 11–17 jan               │
│ ○ 18–24 jan               │
│                           │
│ 13 partes · 105 min       │
│ [ Cancelar ] [ Usar ]     │
└───────────────────────────┘
```

## O que fica de fora nesta etapa

- Reunião de fim de semana: o formato é outro, e posso fazer depois.
- Designações sincronizadas com os anciãos: hoje tudo fica só no seu aparelho.

## Detalhes técnicos

- `src/lib/meeting/mwb-import.ts`: reaproveita `rtfToText` de `rtf-program-import.ts`. Detecta cabeçalhos de semana (`11 a 17 de Janeiro`), seções (Tesouros / Faça seu melhor / Nossa vida cristã), partes `N. Tema (X min)`, cânticos e comentários. Gera `TimerPart[]` com tempos que somam a partir da hora de início. Tem limites de tamanho do arquivo e de quantidade de partes, e testes com os 3 arquivos enviados como amostra.
- Armazenamento no aparelho: `meeting.program.<userId>.<weekMonday>` em localStorage. O estado do cronômetro reaproveita `loadTimer/saveTimer` com o id `meeting-<weekMonday>`, sem colidir com eventos.
- UI: nova rota-pílula em `VisitProgramTabs` (padrão das telas separadas, para links antigos continuarem valendo), que usa `EventTimerFocus` sem mudanças. A tela de foco dos Grandes Eventos não muda.
- Atalho no cartão Visita, só quando a semana da visita é a atual.
- Textos em pt/en/es, uma regra nova no AGENTS.md e o `tsc --noEmit` passando.
