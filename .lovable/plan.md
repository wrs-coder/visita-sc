Atuando como engenheiro sênior, com leitura completa do `instructions.md` (regras 1, 7, 8, 10, 11). Resumo do que será feito e como cada regra é respeitada.

## Missão 01 — Campo "Nome de Usuário" no perfil do ancião

**Onde**: `src/routes/_app.perfil.tsx`, novo card entre "Dados Pessoais" e "E-mail", renderizado **somente quando `role === "elder"`** (super não usa username sintético).

**Comportamento**:
- Carrega `profiles.username` do usuário atual via `supabase.from("profiles").select("username").eq("id", user.id)`.
- Input com normalização local: `value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30)`.
- Botão "Salvar nome de usuário" valida regex `/^[a-z0-9_.-]{3,30}$/` antes do envio.
- `supabase.from("profiles").update({ username }).eq("id", user.id)` — mesma RLS já em vigor (`auth.uid() = id`), mesma técnica que já está em uso para `full_name`, `circuit` e `wife_invite_code` no mesmo arquivo. **Não é dado compartilhado entre papéis** (regra 7 só exige serverFn para escrita compartilhada).
- Trata `error.code === "23505"` (unique violation já existente na coluna `username`) com toast traduzido "Este nome de usuário já está em uso."
- Em sucesso: toast "Nome de usuário atualizado" + `refresh()` do contexto de auth + nota persistente: "Use este nome para entrar no app."

**Sem migration** — coluna `username` e seu índice único já existem (usados por `registerElderByUsername` e `resolveLoginIdentifier`).

## Missão 02 — Login por telefone

### Servidor — `src/lib/auth.functions.ts`, `resolveLoginIdentifier.handler`
Inserir, **entre o bloco "Direct email match" e "Username match"**, um novo bloco:

- Se `id` não contém `@` e `id.replace(/\D/g, "").length >= 8`, consulta `profiles` por `phone = digits`.
- Prioridade de retorno: `email` real (não sintético) → `syntheticEmailFromUsername(username)` → fallback `email`.
- Se não achar, **continua** o fluxo (username → circuito). Isso preserva o caso atual de username puramente numérico, embora colisões reais sejam improváveis (username exige `[a-z0-9_.-]{3,30}` que poderia ser só dígitos, mas o lookup por telefone tem prioridade — comportamento aceitável e documentado).

### Cliente — `src/components/auth/LoginForm.tsx`
- Sem máscara no input — o servidor normaliza com `replace(/\D/g, "")`, então o usuário pode digitar com `+`, espaço, `()` e `-`.
- Atualizar os textos i18n `login.identifierHelp`, `login.identifierLabel` e `login.identifierPlaceholder` para incluir telefone com exemplo `+55 71 98342-0366` (PT/EN/ES).

### Sem migration / sem mudança em RLS
A coluna `profiles.phone` já existe, já é gravada em `registerElderByUsername` e `registerElderByPhone`, e já é única (verificada no upsert). `resolveLoginIdentifier` roda com `supabaseAdmin` (sem RLS), igual aos demais branches.

## Conformidade com `instructions.md`

- **§1, §5** — não toca em roles nem em telas do super; super continua logando por email/circuit.
- **§3, §7** — sem nova tabela, sem nova policy, sem CHECK volátil, sem schema reservado tocado. UPDATE de `profiles.username` cai sob a RLS existente (`auth.uid() = id`).
- **§8** — toda lógica em `createServerFn` existente; sem nova Edge Function; sem `process.env` em escopo de módulo; sem mudar `start.ts`.
- **§9** — sem nova query; após salvar username chamamos `refresh()` do `useAuth` (já atualiza o snapshot local incluindo o cache offline em `PROFILE_CACHE_KEY`).
- **§10** — chaves novas em `pt.json`, `en.json`, `es.json` na mesma alteração, mesma estrutura (`profile.usernameSection.{title,label,help,save,placeholder,taken,updated,loginNote}` e atualização dos 3 `login.identifier*`).
- **§11** — build `bunx tsc --noEmit` antes de fechar.
- **§12** — não bloqueia tela para super; não mexe em modelos; sem hardcode de cores.

## Verificação final
1. `bunx tsc --noEmit` limpo.
2. Smoke manual: ancião com telefone `(71) 98342-0366` cadastrado consegue logar digitando `+5571983420366`, `71 98342-0366` ou `71983420366`. Super continua logando por email/circuito. Ancião abre "Meu perfil", vê e altera seu username; tentativa de username já tomado mostra "já está em uso".

## Sobre gerar novo APK
Sim — a alteração toca **somente código web (TS/TSX) e i18n**, nenhuma config de Capacitor/Android. Após validar no preview, o APK precisa ser regerado com `bun run android:release:apk` para que o ancião acesse o novo card no perfil e o login por telefone no app instalado. **Não é necessário** mudar `versionCode`/`versionName`, signing key, manifesto, ícones nem `capacitor.config.ts`.

## Fora de escopo
- "Esqueci a senha" por SMS (exige provider; o usuário não pediu).
- Cadastro inicial — formulários já coletam telefone.
- Bíblia / TNM / modelos — intocados (memória do projeto: zero Bíblia embutida — não afetado).
