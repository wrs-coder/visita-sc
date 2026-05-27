## Finding
Scanner flags that `public.user_roles` has only SELECT policies and no INSERT/UPDATE/DELETE policies — risk only materializes if a client-accessible path writes to it.

## Investigation
All writes to `user_roles` in the codebase go through **server functions using `supabaseAdmin`** (service role, server-only):

- `src/lib/auth.functions.ts` — every insert/update wrapped in `createServerFn` + `supabaseAdmin`:
  - Superintendent self-promotion (lines 46–48, 291–293): only inserts `role: "superintendent"` for the authenticated `userId` itself, with `congregation_id: null`. No congregation linkage = no privileges over others.
  - Elder registration (lines 128, 235, 319, 397): `position` is validated by `z.enum(ELDER_REGISTERABLE_POSITIONS)` (`coordenador`, `secretario`, `sup_servico`) — Zod rejects any other value including `superintendent` or `corpo` before the DB insert. Congregation membership is verified via invite code prior to insert.
- `src/lib/backup.functions.ts` — read-only (`select`).

No client code (`supabase` browser client) writes to `user_roles`. RLS denies-by-default for INSERT/UPDATE/DELETE, which is the intended posture — only the service role can write, and every server path validates the role/position value against an allowlist.

## Plan
No code changes required. The finding is a precautionary warning, not an actual vulnerability in this codebase.

1. Mark the scanner finding `user_roles_missing_insert_update_delete_policies` as **ignored** via `security--manage_security_finding`, with an explanation documenting:
   - All writes use `supabaseAdmin` inside `createServerFn` handlers.
   - `role` is never accepted from client input; it is hardcoded in each server handler.
   - `elder_position` is validated against `ELDER_REGISTERABLE_POSITIONS` via Zod before any write.
   - Denying client writes via missing RLS policies is the deliberate defense-in-depth posture.

2. Update `security--update_memory` to record this intentional posture so future scans don't re-flag it:
   - "Writes to `public.user_roles` are server-only via `supabaseAdmin`; client/`authenticated` role has no INSERT/UPDATE/DELETE policies by design. All role and elder_position values are validated server-side (hardcoded `role`, Zod-enum `elder_position`)."

No SQL migration, no UI change, no behavior change — only scanner-state and security-memory updates.