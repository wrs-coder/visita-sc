# Plano: 2 avisos do Monitoramento + Leitura da Bíblia + Esboços

Nada aqui mexe no banco de dados, no login ou na versão. Tudo fica no aparelho.

---

## PARTE A — Os 2 avisos do Monitoramento

### A1. Não dá mais para apagar um link nem desligar o tempo de um tópico
A caixa nova de digitar deixa **Salvar** apagado com o campo vazio. Mas em 2 lugares o vazio tem função:
- **Link no esboço:** apagar o endereço = remover o link.
- **Minutos do tópico (⏱):** apagar = desligar o tempo ("vazio = sem controle de tempo").

**Como afeta:** superintendente e esposa. Nada se perde, mas link/tempo "grudam".

```text
HOJE                          DEPOIS
┌─────────────────────────┐   ┌─────────────────────────┐
│ Minutos do tópico       │   │ Minutos do tópico       │
│ vazio = sem controle    │   │ vazio = sem controle    │
│ [                     ] │   │ [                     ] │
│ [Cancelar] [Salvar]░░░  │   │ [Cancelar] [ Salvar ]   │
│        (apagado)        │   │  (desliga o tempo)      │
└─────────────────────────┘   └─────────────────────────┘
```
**Correção:** opção "aceita vazio" só nesses 2 lugares; as demais caixas continuam exigindo texto.
**Chance de quebrar:** muito baixa.

### A2. Depois de salvar, outras telas podem mostrar dados antigos
O celular guarda a "cópia local" (atualizada ao salvar) e uma "foto" de cada resposta recebida. A tela lê a **foto** primeiro, e ela não é renovada ao salvar (só há 90 s de folga). Ex.: edita a visita, 3 min depois abre Painel/Lixeira/Resumo → dado velho até tocar **Sincronizar**.

**Como afeta:** todos (superintendente, anciãos, esposa). Nada se perde no servidor; só a tela fica desatualizada e confunde.
**Correção:** quando um salvamento dá certo, descartar as "fotos" daquela tabela e das listas do servidor (esboços, lixeira, resumo). A próxima leitura usa a cópia local atualizada. Sem internet, tudo igual.
**Chance de quebrar:** baixa a média (é o coração do offline). Proteção: só **apagar** fotos, nunca gravar dados; a cópia local que faz o app funcionar sem internet não é tocada; testes de "salvar → foto descartada" e "sem internet → ainda lê da cópia local" (simulando modo avião).

---

## PARTE B — Leitura da Bíblia

### B1. Título sempre abreviado (leitor e balão bíblico)
Hoje "Jeremias 51:1-64" aparece cortado "Jeremias 51:1...". Regra nova: **todo título usa o livro abreviado**, no topo do leitor e no balão.
```text
ANTES                         DEPOIS
┌─────────────────────────┐   ┌─────────────────────────┐
│ ←  Jeremias 51:1...  ✓  │   │ ←  Jer 51:1-64  [Aa] ✓  │
└─────────────────────────┘   └─────────────────────────┘
Balão:  "1 Tessalonicense..." → "1 Tes 5:12,13"
```

### B2. Aviso de leitura atrasada com dias
Se a leitura do dia não foi feita, aparece um selo vermelho com quantos dias desde a última leitura.
```text
┌─────────────────────────────┐
│ Leitura pessoal             │
│ ⚠ Atrasada · 3 dias         │
│ [ ▶ Continuar · Gên 17:1-27]│
└─────────────────────────────┘
```
Contagem: dias entre a última leitura marcada e hoje (só dias com leitura programada, quando a meta "Dias" estiver ligada). Hoje já lido = sem selo.

### B3. Caixa "Continuar" com versículos
"Continuar · Gênesis 17" → **"Continuar · Gên 17:1-27"** (primeiro ao último versículo do capítulo, lidos da Bíblia importada; sem Bíblia importada, mostra só o capítulo).

### B4. Barra de progresso do livro no topo
```text
┌─────────────────────────────┐
│ ←  Jer 51:1-64   [Aa]  ✓    │
│ Jeremias  ▓▓▓▓▓▓▓▓▓░  50/52 │  ← nova barra do livro
├─────────────────────────────┤
│ Jeremias 51                 │
│ 1 Assim diz Jeová...        │
```
Mostra capítulos lidos do livro atual / total. As barras existentes continuam iguais.

**Chance de quebrar (B1–B4):** baixa — só apresentação; leituras, destaques e anotações não mudam.

---

## PARTE C — Esboços: botão direto de tela cheia
No **Modo Esboço** e no **Modo edição**, um ícone ⤢ ao lado dos ⋯ abre a tela cheia. A opção nos ⋯ continua.
```text
┌─────────────────────────────┐
│ ←  Meu esboço   ⇕  ⤢  ⋯     │
├─────────────────────────────┤
│ [Esboço] [Edição]           │
```
No modo edição, a tela cheia abre o mesmo leitor em tela cheia já usado hoje (o texto em edição é salvo como hoje antes de abrir).
**Chance de quebrar:** muito baixa.

---

## Detalhes técnicos
- A1: `appPrompt(msg, def, { allowEmpty })` em `app-dialogs.tsx`; usar em `RichNoteToolbar.promptLink` e `outline-topic.ts` timeBtn.
- A2: `response-cache.ts` ganha `invalidateCached(pred)`; `local-first-fetch.ts` invalida chaves `rest:` de `/rest/v1/<tabela>` após write ok; `markWriteSucceeded` também limpa chaves `fn:`.
- B1: `compactRefTitle` sempre abrevia (sem limite de 16); CleanReader já usa `abbreviateBookName` — remover dependência do `truncate` cortando o span (span com `shrink-0`).
- B2: `reading-day-log.ts` `overdueDays(plan, last, now)` + selo em `BibleReadingTab`/`BibleTrackExtras`.
- B3: `label()` acrescenta `chapterVerseSpan` via cache de versículos do capítulo.
- B4: barra fina em CleanReader com `done` filtrado pelo livro / total de capítulos.
- C: botão `Maximize2` em `OutlinesWorkspace` header (mode outline e edit, exceto talk), chama `onFullscreen`.
- Testes: dialogs vazio, invalidação de cache, `compactRefTitle`, `overdueDays`. Validar `bunx tsgo --noEmit` e `bunx vitest run`; resolver os 2 avisos.
