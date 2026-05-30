## Objetivo

Adicionar um novo modo de acesso para a esposa do superintendente:

- O super cria um **código próprio da esposa** no "Meu perfil".
- A esposa entra pelo mesmo botão **"Acesso corpo de anciãos e ESC"** da tela de login.
- No painel, ela vê um **dropdown das congregações ativas** do super (igual ao "congregação ativa" do dashboard) e um botão **"Semana atual"** que reposiciona a visualização para a semana vigente da congregação escolhida.
- Login **persistente** (não precisa redigitar o código ao reabrir o app).
- **Restrições de visualização atuais preservadas** (sem checklist, sem reunião de anciãos/ESC, `visible_to_spouse` em eventos de circuito, etc.).

O fluxo antigo `código + *` **continua funcionando idêntico** para quem já usa. Sem migração de dados, sem deprecação imediata — os dois modos convivem.

---

## 1. Banco de dados (migração)

Adicionar coluna na tabela `profiles`:

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wife_invite_code text UNIQUE;
```

- `NULL` por padrão; nenhum dado existente é alterado.
- `UNIQUE` global (mesmo formato de `congregations.invite_code`).
- Validação de formato no servidor: 4–12 chars `[A-Z0-9]`, sem `*`.
- RLS de `profiles` já cobre: só o próprio super lê/edita o seu (`auth.uid() = id`). Sem GRANT/POLICY novas.

---

## 2. `src/lib/guest.functions.ts` — resolver super-code

`getGuestSnapshot` ganha um caminho adicional para resolver `wifeMode`, sem mexer no atual:

Input passa a aceitar opcionalmente uma congregação escolhida:

```ts
{ inviteCode: string, congregationId?: string }
```

Lógica:

1. Se o código **termina em `*`** → fluxo antigo (compatibilidade total), nada muda.
2. Caso contrário, tenta primeiro casar com `profiles.wife_invite_code`:
   - Se casar → `wifeMode = true`. Busca as **congregações ativas** do super (`superintendent_id = profile.id AND is_active = true`).
   - `selectedCongregationId` = `input.congregationId` (se pertencer ao super) ou a primeira ativa.
   - Monta o snapshot exatamente como hoje no `wifeMode`, só que para a congregação escolhida. Todos os filtros existentes (`visible_to_spouse`, sem checklist, sem elders, sem templates de reunião) continuam aplicados.
3. Se não casar com `wife_invite_code` → cai no caminho atual (`congregations.invite_code` = elder/ESC).

Resposta ganha 2 campos extras **apenas no modo novo**:

- `availableCongregations: { id: string; name: string }[]`
- `selectedCongregationId: string`

Toda a lógica continua dentro do `createServerFn` com `supabaseAdmin` (igual ao guest atual). Nenhuma alteração em RLS.

---

## 3. `src/lib/guest-session.ts` — login persistente + estado do painel

- Manter `guest_invite_code` e `guest_week_start` (fluxo antigo, expira semanalmente — sem mudança).
- Novos itens no `localStorage`, **só usados quando o código é super-code**:
  - `guest_selected_congregation_id` — última congregação escolhida pela esposa.
  - `guest_week_anchor` — `null` (semana atual) ou ISO date (futuro, caso adicionemos navegação de semanas depois).
- `readGuestSession()` passa a devolver `{ code, congregationId, weekAnchor }`.
- Detecção do modo: se `code` não termina em `*`, **não aplicar expiração semanal** — login persistente. Só limpa em logout explícito.

---

## 4. Novo server function — salvar código da esposa

Arquivo: `src/lib/profile.functions.ts` (criar se não existir; senão, acrescentar).

```ts
export const setWifeInviteCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    code: z.string().trim().toUpperCase()
      .regex(/^[A-Z0-9]{4,12}$/, "4–12 caracteres, A–Z e 0–9")
      .nullable(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ wife_invite_code: data.code })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
```

- `UNIQUE` no banco protege contra colisão; o serverFn devolve mensagem amigável se o código já existir.
- Helper `generateWifeCode()` no cliente para sugerir um código aleatório de 8 chars.

---

## 5. Perfil do superintendente (`src/routes/_app.perfil.tsx`)

Nova seção **"Acesso da esposa"** (visível apenas quando `role === "superintendent"`):

- Campo `wife_invite_code` (texto, 4–12 chars A–Z/0–9, uppercase automático).
- Botão **"Gerar código"** (gera aleatório), botão **"Copiar"**, botão **"Salvar"**.
- Botão **"Remover"** (limpa o código → invalida acessos novos; sessões já abertas continuam até logout).
- Texto explicativo: *"Compartilhe este código com sua esposa. Ela usa o mesmo botão **Acesso corpo de anciãos e ESC** na tela de login. Esse acesso é persistente e dá visão de todas as suas congregações ativas, com as mesmas restrições do acesso atual da esposa."*

---

## 6. Tela de login do visitante

Nenhuma mudança visível: o mesmo botão **"Acesso corpo de anciãos e ESC"** aceita qualquer código. O servidor decide se é elder, esposa-antiga (`*`) ou esposa-nova (super-code).

---

## 7. Painel do visitante (`src/routes/visitante.painel.tsx`)

Quando `snap.wifeMode && snap.availableCongregations` (modo novo):

- **Header**: dropdown "Congregação ativa" listando `availableCongregations` (já filtrado para ativas no servidor). Ao trocar:
  1. Persiste em `localStorage` (`guest_selected_congregation_id`).
  2. Refaz `getGuestSnapshot({ inviteCode, congregationId })`.
- **Botão "Semana atual"** ao lado do dropdown: limpa `guest_week_anchor` e recarrega o snapshot, garantindo que a visualização reflita a semana vigente daquela congregação.
- Resto da UI **idêntico** ao `wifeMode` atual (mesmas abas, mesmas restrições).

Para o fluxo antigo (`código*`): painel renderiza exatamente como hoje (sem dropdown, sem botão "Semana atual").

---

## 8. i18n

Novas chaves em `src/i18n/locales/{pt,en,es}.json`:

- `profile.wifeAccess.title / description / codeLabel / placeholder / generate / copy / save / remove / saved / copied / removed / errorTaken / errorFormat`
- `guest.congregationPicker.label`
- `guest.currentWeek`

---

## Garantias de não-quebra

- **Esposas que já usam `código*`**: funcionam idênticas (mesmo path no serverFn, mesma expiração semanal, mesma UI).
- **Acesso de anciãos/ESC**: intocado.
- **RLS e policies**: zero alteração. Toda a lógica nova roda em `createServerFn` com `supabaseAdmin`, como o guest atual.
- **Restrições de visualização**: as flags `wifeMode` no servidor já filtram checklist, elders e `visible_to_spouse`. Só passamos `wifeMode=true` por um caminho a mais.
- **Bíblia, busca de versículos, importação EPUB**: intocados.
- **Migração de dados**: nenhuma — os dois modelos convivem; a esposa migra naturalmente quando o super gerar o código novo e compartilhar.

---

## Arquivos previstos

- **Migração**: `supabase/migrations/<timestamp>_add_wife_invite_code.sql` (nova coluna em `profiles`).
- **Edit** `src/lib/guest.functions.ts` — resolver super-code, devolver `availableCongregations` + `selectedCongregationId`.
- **Edit** `src/lib/guest-session.ts` — persistência sem expiração para super-code; storage de congregação selecionada e weekAnchor.
- **New/Edit** `src/lib/profile.functions.ts` — serverFn `setWifeInviteCode`.
- **Edit** `src/routes/_app.perfil.tsx` — nova seção "Acesso da esposa".
- **Edit** `src/routes/visitante.painel.tsx` — dropdown de congregação ativa + botão "Semana atual" no modo novo.
- **Edit** `src/i18n/locales/{pt,en,es}.json` — chaves novas.

Sem mudanças em: `bible-notes-store.ts`, `BibleManagerDialog.tsx`, parser EPUB, busca/exibição de versículos, RLS, edge functions, painel do super, modelos, reuniões.

---

## Verificação pós-implementação

- Build TypeScript limpo (tipos do Supabase regenerados após a migração).
- Super gera código no perfil → esposa loga uma vez → fecha e reabre o app → continua logada.
- Dropdown lista só congregações ativas; trocar atualiza o painel; "Semana atual" reposiciona corretamente.
- Esposa-nova **não** vê: checklist, reunião de anciãos/ESC, eventos de circuito com `visible_to_spouse=false`.
- Login antigo com `código*` continua funcionando exatamente como antes.
