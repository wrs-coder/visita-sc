# Correção dos 2 avisos do Monitoramento

## Problema 1 — Não dá mais para apagar um link nem desligar o tempo de um tópico

**O que acontece hoje:** a caixa nova de digitar (que trocou o "visitasc.com.br diz:") deixa o botão **Salvar** apagado quando o campo está vazio. Só que dois lugares precisam justamente do campo vazio:
- **Editor de esboço → Link:** apagar o endereço servia para *remover o link*.
- **Tópico com tempo (⏱):** apagar os minutos servia para *desligar o cronômetro* — a própria caixa diz "vazio = sem controle de tempo".

**Quem é afetado:** superintendente e esposa, ao editar esboços/anotações. Nada é perdido, mas o link ou o tempo "grudam" e não saem.

```text
HOJE                          DEPOIS
┌─────────────────────────┐   ┌─────────────────────────┐
│ Minutos do tópico       │   │ Minutos do tópico       │
│ vazio = sem controle    │   │ vazio = sem controle    │
│ ┌─────────────────────┐ │   │ ┌─────────────────────┐ │
│ │                     │ │   │ │                     │ │
│ └─────────────────────┘ │   │ └─────────────────────┘ │
│ [Cancelar] [Salvar]░░░  │   │ [Cancelar] [ Salvar ]   │
│        (apagado)        │   │  (ativo: desliga tempo) │
└─────────────────────────┘   └─────────────────────────┘
```

**Correção:** a caixa ganha uma opção "aceita vazio", ligada só nesses dois lugares. Todas as outras caixas (nome de pasta, modelo etc.) continuam exigindo texto.

**Chance de quebrar algo:** muito baixa. Visual igual; muda só uma regra em 2 pontos.

---

## Problema 2 — Depois de salvar, outras telas podem mostrar dados antigos

**O que acontece hoje:** o celular guarda duas coisas: a "cópia local" (atualizada a cada salvamento) e uma "foto" de cada resposta já recebida. Ao abrir uma tela, a **foto** é lida primeiro — e ela não é atualizada quando você salva. Só nos 90 segundos após salvar o app busca na internet.

**Exemplo:** edita a visita ou apaga um esboço, 3 minutos depois abre o Painel/Lixeira/Resumo → ainda aparece o dado velho até tocar **Sincronizar**.

**Quem é afetado:** todos (superintendente, anciãos, esposa). Nada é perdido no servidor; é só a tela desatualizada — mas confunde (lembra o caso dos anciãos e "Assuntos locais").

**Correção (sem mudar a tela):**
1. Quando um salvamento dá certo, apagar as "fotos" ligadas àquela tabela (ex.: salvou refeição → fotos de refeições/visita são descartadas). A próxima leitura usa a cópia local já atualizada.
2. Para leituras por funções do servidor (lista de esboços, lixeira, resumo da visita), descartar as fotos dessas funções após qualquer salvamento.
3. Continua offline-first: sem internet, tudo funciona igual.

**Chance de quebrar algo:** baixa a média — é o coração do modo offline. Para proteger:
- Não mexer no banco nem no formato da cópia local.
- Só **apagar** fotos (nunca escrever dados novos) — no pior caso, o app busca na internet ou na cópia local.
- Testes novos: salvar → foto descartada; sem internet → leitura ainda funciona.

---

## Detalhes técnicos
- `app-dialogs.tsx`: `appPrompt(msg, default, { allowEmpty })`; `allowEmpty` libera botão/submit e resolve `""`. Usar em `RichNoteToolbar.promptLink` e no `timeBtn` de `outline-topic.ts`.
- `response-cache.ts`: `invalidateCached(predicate)` / `invalidateByTable(table)` e `invalidateFnCache()`.
- `local-first-fetch.ts`: após write bem-sucedido (junto do `mirrorWrite`), invalidar chaves `rest:` cuja URL tenha `/rest/v1/<tabela>`; `net-policy.markWriteSucceeded` também chama `invalidateFnCache()`.
- Testes: `app-dialogs.test.ts` (vazio permitido/não permitido), novo `local-first-fetch` invalidation test.
- Validar `bunx tsgo --noEmit` e `bunx vitest run`; resolver os 2 findings. Sem mudança de banco, sem bump de versão.
