# Correção: `program_templates_slot_check`

## Diagnóstico

O erro **não vem** do novo fluxo de transporte (Missão 6) — `transport_schedule` está OK. Vem da tela **/modelos** (modelos de programação), onde você tentou salvar um item (provavelmente do bloco "Transporte" do modelo) em um slot maior que 3.

Causa raiz: divergência entre UI/servidor e o banco.

| Camada | Limite atual de `slot` |
|---|---|
| UI (`src/routes/_app.modelos.tsx`, `SLOTS`) | 1..10 |
| Zod (`upsertTemplate` em `src/lib/templates.functions.ts:42`) | 1..10 |
| **DB constraint `program_templates_slot_check`** | **1..3** ❌ |

Quando você cria/renomeia o 4º modelo (ou superior), o `INSERT` no `program_templates` viola a constraint e a falha aparece em qualquer ação subsequente daquele slot — inclusive ao adicionar um item de transporte (porque `ensureTemplate(slot)` é chamado antes de salvar o item).

Dados atuais já usam até slot 3 — nenhum registro precisa ser migrado.

## Mudança

Uma única migração, sem alterações de código (UI e Zod já estão corretos em 1..10):

```sql
ALTER TABLE public.program_templates
  DROP CONSTRAINT program_templates_slot_check;

ALTER TABLE public.program_templates
  ADD CONSTRAINT program_templates_slot_check
  CHECK (slot >= 1 AND slot <= 10);
```

## Por que não mexer no Zod nem na UI

- A UI já oferece 10 slots (`SLOTS = [1..10]`) e a tradução `templates.templateNumber` cobre todos.
- O Zod em `upsertTemplate` já aceita `min(1).max(10)`.
- A constraint do DB era o único ponto fora de sincronia. Reduzir UI/Zod para 3 seria regressão (e quebraria modelos já planejados).

## Verificação pós-migração

1. Em `/modelos`, abrir aba "Modelo 4", renomear → sem erro.
2. Adicionar item de tipo Transporte/Estudo/Refeição no Modelo 4 → salva.
3. Reabrir a aba e confirmar persistência.

## Observação

Os dois fluxos têm nomes parecidos mas são independentes:
- **Modelos de programação** (`program_templates` + `program_template_items` com `kind="transport"`) — afetado por este bug.
- **Agenda de transporte da visita** (`transport_schedule`, Missão 6) — não afetado.
