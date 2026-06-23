## Objetivo

Garantir que os anciãos visitantes (acesso "Corpo de Anciãos / ESC") vejam, de forma organizada e exportável, **todas** as abas da Semana da Visita disponíveis no app do superintendente:

1. Cronograma
2. Estudos e Revisitas
3. Reuniões de Campo
4. **Reuniões e Discursos** (faltando hoje como aba dedicada)
5. Refeições
6. Transporte
7. **Pastoreios, Recomendações e Outros** (já existe como "Anciãos", incluir no export)
8. Checklist

Escopo: apenas o painel do convidado (`src/routes/visitante.painel.tsx`). Nenhuma mudança em schema, RLS, server functions ou `getGuestSnapshot` — os dados de midweek/weekend/pioneer/elders e `templateExtras` já chegam no snapshot atual; só não há aba e nem entradas no diálogo de exportação.

## Mudanças

### 1. Nova aba "Reuniões e Discursos" (`value="reunioes"`)

- Adicionar `<TabsTrigger value="reunioes">` com ícone `Mic` (já importado), ao lado de "Anciãos". Apenas no modo ancião (`!snap.wifeMode`). Atualizar `grid-cols-8` → `grid-cols-9` no modo ancião; modo esposa permanece `grid-cols-7`.
- `<TabsContent value="reunioes">` renderiza, em cards consistentes com o restante do painel:
  - **Reunião de meio de semana** (`snap.midweek`) — presidente, tema do discurso de serviço, oração final, com `meeting_at` quando houver. Bloco `TemplateExtraBlock` com `templateExtras.midweek.observations`.
  - **Reunião de fim de semana** (`snap.weekend`) — tema do discurso público, título, com `meeting_at`. Bloco `TemplateExtraBlock` com cântico inicial/final + observações do `templateExtras.weekend`.
  - **Reunião com pioneiros / Reunião do superintendente com pioneiros** (`snap.pioneer`) — tema, local, oração inicial/final, horários. `TemplateExtraBlock` com `templateExtras.pioneer.observations`.
  - **Reunião com anciãos e servos ministeriais** (`snap.elders`) — tema, oração inicial/final, local, `meeting_at`. `TemplateExtraBlock` com `templateExtras.elders.observations`.
- Cada subseção tem um cabeçalho com ícone e título; usa o mesmo padrão visual ("premium" = card + chip de data/hora + linha discreta de observação) já adotado nas abas Estudos / Campo.

### 2. Diálogo "Compartilhar" — incluir as novas seções

- Estender `SectionKey` para `"cron" | "estudos" | "campo" | "reunioes" | "ref" | "trans" | "pastoreios" | "check"`.
- `availableSections`: incluir `reunioes` sempre; incluir `pastoreios` e `check` apenas quando `!snap.wifeMode`.
- `SECTION_LABELS`: adicionar `reunioes` = "Reuniões e Discursos" e `pastoreios` = "Pastoreios, Recomendações e Outros" (com i18n PT/EN/ES em `guest.sections.*`).
- `selected` default: todas marcadas.
- `SharePreview`: novos blocos renderizando midweek/weekend/pioneer/elders e o programa de anciãos (reaproveitar `ElderProgramReadOnly` em layout de impressão simples — sem interatividade) quando os respectivos flags estiverem ativos.
- `shareWhatsapp`: novos parágrafos `*Reuniões e Discursos*` e `*Pastoreios, Recomendações e Outros*` com bullets por evento.
- Export PNG/PDF: nenhuma mudança de mecânica — já captura o conteúdo de `previewRef` via `html-to-image` + `jsPDF`. Como o conteúdo cresce, manter o `pdf` em `a4` retrato e o algoritmo de proporção atual (já dimensiona corretamente conteúdos longos).

### 3. i18n

Adicionar nas três línguas (`pt.json`, `en.json`, `es.json`):

- `guest.sections.reunioes` ("Reuniões e Discursos" / "Meetings and Talks" / "Reuniones y Discursos")
- `guest.sections.pastoreios` ("Pastoreios, Recomendações e Outros" / etc.)
- `guest.tabs.meetings` ("Reuniões" / "Meetings" / "Reuniones") — rótulo curto da aba (md:+).
- Subtítulos da aba: `guest.meetingsTalks.midweek`, `.weekend`, `.pioneer`, `.elders`.

## Garantias de integridade (Eng. Sr.)

- **Segurança/RLS/DB**: nenhuma migração, nenhuma alteração de policies, nenhum novo server function. Toda mudança é de UI a partir de dados que o `getGuestSnapshot` já entrega (modo somente leitura para o convidado).
- **Modo "Esposa" inalterado**: a aba "Reuniões e Discursos" só aparece quando `!snap.wifeMode`. A grade vira `grid-cols-9` no modo ancião e segue `grid-cols-7` no modo esposa.
- **Não quebrar exportações existentes**: chaves antigas permanecem; apenas adicionamos novas e o `SharePreview` continua tolerante a `selected[k] === undefined` para cache antigo (default true).
- **Sem novos `console.log`, `any`, `as` arriscado**. Tipos novos derivados do `Snapshot` já tipado.
- **Build check**: rodar `bunx tsc --noEmit` ao final.

## Validação manual

1. Logar como ancião visitante via código da congregação.
2. Ver as 9 abas (Hoje, Cronograma, Estudos, Reuniões de Campo, Refeições, Transporte, **Reuniões e Discursos** (nova), Anciãos, Checklist).
3. Conferir que cada bloco da nova aba lista corretamente os dados existentes e o `TemplateExtraBlock` quando há observação do modelo.
4. Abrir "Compartilhar", marcar todas as seções → conferir prévia com todos os blocos → exportar PNG e PDF → conferir que o arquivo contém todas as seções → enviar via WhatsApp e conferir o texto formatado.
5. Logar como esposa: confirmar que a aba "Reuniões e Discursos" NÃO aparece e que o diálogo de Compartilhar não oferece `reunioes`/`pastoreios`/`check`.

## Sobre novo APK

Apenas alterações em código web (TSX + i18n). **Não é necessário gerar novo APK** se o app Android já está em produção apontando para a build web atualizada (o WebView carrega a nova versão automaticamente após publish). Se a estratégia for empacotar com Capacitor sem update OTA, basta `bunx cap sync android` + rebuild — nenhuma mudança em `AndroidManifest`, permissões ou `versionCode/Name`.