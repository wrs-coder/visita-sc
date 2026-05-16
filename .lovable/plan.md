## Objetivo

Permitir que **Anciãos** e **Esposa do Superintendente (ES)** acedam ao app apenas com o **código da congregação**, sem registo, sem e-mail e sem senha. O Superintendente continua a usar login normal (e-mail/senha).

## Regras de acesso por código

- **Código exato** (ex.: `1234`) → modo **Ancião / Corpo de Anciãos** (apenas leitura da Programação/Cronograma daquela congregação). Botões de editar, eliminar, backup, modelos e configurações ficam ocultos.
- **Código com `*` no final** (ex.: `1234*`) → modo **ES (Esposa do Superintendente)**. Acesso ao Dashboard mostrando **apenas Programação/Cronograma**. Checklist da Congregação fica oculto. Sem edição/configuração.
- **Código inválido** → toast de erro.

## Persistência

- **Ancião**: guardar `{ congregationId, role: "elder_viewer" }` em `localStorage` permanentemente.
- **ES**: guardar `{ congregationId, role: "es", weekStart: <segunda-feira atual ISO> }` em `localStorage`. Ao abrir o app, se `weekStart` for diferente da segunda-feira da semana atual → limpar e exigir novo código.
- Superintendente continua usando a sessão Supabase nativa (já persiste).

## Arquitetura

### 1. Server function pública de validação
Novo `src/lib/guest-access.functions.ts`:
- `validateCongregationCode({ code })` — server fn pública (usa `supabaseAdmin`, sem auth). Detecta sufixo `*`, faz lookup em `congregations.invite_code`, retorna `{ ok, congregationId, congregationName, mode: "elder" | "es" }` ou `{ ok: false, error }`.

### 2. Hook de sessão "guest"
Novo `src/hooks/use-guest-session.ts`:
- Lê/escreve `localStorage` chave `visita-guest-session`.
- Expõe `{ guest, setGuest, clearGuest, isElderGuest, isEsGuest }`.
- Para ES: valida `weekStart === segunda-feira da semana atual`; se não, limpa.

### 3. Login
`LoginForm.tsx`: substituir o formulário do Ancião por um **único campo "Código da Congregação"** + botão Entrar. Chama `validateCongregationCode`, grava em `localStorage` e redireciona:
- elder → `/cronograma`
- es → `/dashboard`

Manter botão "Sou superintendente" inalterado.
Remover link "criar acesso" do ancião e "esqueci senha" do ancião (não aplicável).

### 4. Rota raiz `/`
`src/routes/index.tsx`: além de checar `user` do Supabase, checar guest session e redirecionar conforme o role.

### 5. Layout `_app`
`src/routes/_app.tsx`:
- Ler guest session.
- Se `isElderGuest`: ocultar todas as abas exceto **Cronograma**. Bloquear acesso direto às outras rotas (redirect).
- Se `isEsGuest`: mostrar apenas **Dashboard** + **Cronograma**. Ocultar Checklist da Congregação e todas as abas de edição/configuração/modelos/perfil.
- Mostrar botão "Sair" que limpa guest session.

### 6. Ocultar ações de escrita
Nas páginas `_app.cronograma.tsx` e `_app.dashboard.tsx`: usar `isElderGuest || isEsGuest` para esconder botões de **editar, eliminar, criar, importar/exportar modelo, backup**.

### 7. RLS — IMPORTANTE
As tabelas atuais exigem `auth.uid()` na congregação. Para guest funcionar sem login, o `validateCongregationCode` e a leitura dos dados precisam usar `supabaseAdmin` via server functions públicas:
- Novo `getGuestSchedule({ congregationId })` — retorna `visits`, `schedule_events`, `field_meetings`, `field_assignments`, `meals`, `transport_schedule` da visita ativa daquela congregação. Sem dados privados (sem `private_notes`, sem checklist).
- O cronograma do guest passa a chamar essa server fn em vez das queries diretas via `supabase` autenticado.

## Diagrama de fluxo

```text
Login screen
  │
  ├── Código "1234"  ─► validateCongregationCode ─► guest{elder} ─► /cronograma (read-only)
  ├── Código "1234*" ─► validateCongregationCode ─► guest{es,weekStart} ─► /dashboard (só cronograma)
  └── E-mail/senha   ─► supabase signIn ─► /dashboard ou /cronograma (por role)

Reabertura do PWA:
  guest{elder}  → entra direto
  guest{es}     → se weekStart != segunda atual → limpa, exige código
  supabase user → entra direto
```

## Arquivos a criar/editar

**Criar:**
- `src/lib/guest-access.functions.ts` — validação + leitura de cronograma para guest.
- `src/hooks/use-guest-session.ts` — gestão do localStorage.

**Editar:**
- `src/components/auth/LoginForm.tsx` — UI com campo único de código.
- `src/routes/index.tsx` — redirecionar guests.
- `src/routes/_app.tsx` — filtrar abas, bloquear rotas, botão sair.
- `src/routes/_app.cronograma.tsx` — esconder ações de escrita, suportar fonte de dados guest.
- `src/routes/_app.dashboard.tsx` — para ES, mostrar apenas cronograma.

## Notas técnicas

- `supabaseAdmin` em server functions é seguro: a entrada é só o código da congregação, e devolvemos apenas dados não sensíveis (programação pública da visita). Validamos `length` e formato do código com Zod.
- O Cron da ES (re-pedir código toda segunda) usa `new Date()` no client, calcula segunda-feira da semana e compara com `weekStart` guardado. Sem servidor.
