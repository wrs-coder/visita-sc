## Objetivo

Adicionar uma nova opção **"Esposa"** no seletor "Evento com" (escopo) ao criar/editar um evento no cronograma do superintendente. Quando selecionada:
- O evento é visível **apenas** para o superintendente (criador) e para a esposa (acesso via `wife_invite_code`).
- **Nenhum** outro acesso — ancião cadastrado, ESC, ou ancião visitante via `código*` — vê o evento.
- O toggle **"Ocultar para esposa"** fica oculto (não faz sentido, pois é um evento direcionado a ela).
- Não exige seleção de congregação.

É possível sem quebrar o app: `circuit_schedule_events.scope` é `text` livre, então adicionar o novo valor `"wife"` é seguro. Precisaremos ajustar **RLS** para impedir que anciãos cadastrados vejam o novo escopo, e ajustar o filtro do guest para impedir anciãos visitantes (`código*`).

## Mudanças

### 1. Migração SQL — RLS de `circuit_schedule_events`
Substituir a policy `members read circuit events for their congregation` para excluir `scope = 'wife'`:
```sql
DROP POLICY "members read circuit events for their congregation" ON public.circuit_schedule_events;

CREATE POLICY "members read circuit events for their congregation"
ON public.circuit_schedule_events FOR SELECT
USING (
  scope <> 'personal'
  AND scope <> 'wife'
  AND (
    (scope = 'all' AND EXISTS (
      SELECT 1 FROM congregations c
      WHERE c.superintendent_id = circuit_schedule_events.superintendent_id
        AND c.id = private.get_user_congregation(auth.uid())
    ))
    OR (scope NOT IN ('all','wife') AND private.get_user_congregation(auth.uid()) = ANY (congregation_ids))
  )
);
```
A policy `super manages own circuit events` permanece e cobre leitura/escrita do super dono.

### 2. `src/routes/_app.cronograma.tsx` (super)
- Estender `type Scope` para incluir `"wife"`.
- Adicionar `<SelectItem value="wife">{t("schedule.scopes.wife")}</SelectItem>`.
- Em `handleSave`: tratar `"wife"` como `personal`/`all` (não exigir congregações; salvar `congregation_ids: []`); forçar `visible_to_spouse: true`.
- Esconder o bloco do switch "Ocultar para esposa" quando `scope === "wife"`.
- Badge: rótulo "Esposa" quando `e.scope === "wife"` em `scopeBadge`.

### 3. `src/lib/guest.functions.ts` (painel de visitante)
No `circuitFiltered` (linha 89):
```ts
if (e.scope === "wife") {
  // só visível para a esposa (wifeMode); nunca para ancião visitante via código*
  return wifeMode && e.superintendent_id === cong!.superintendent_id;
}
if (e.scope === "all") return e.superintendent_id === cong!.superintendent_id;
return Array.isArray(e.congregation_ids) && e.congregation_ids.includes(cong!.id);
```
Assim, sessões `código*` (anciãos visitantes) **não** recebem eventos `wife`. Sessões da esposa recebem, independentemente da congregação selecionada no dropdown.

### 4. i18n — `src/i18n/locales/{pt,en,es}.json`
- `schedule.scopes.wife`: pt `"Esposa"`, en `"Wife"`, es `"Esposa"`.

## O que NÃO muda

- Tabela e colunas (sem ALTER): `scope` é text, `visible_to_spouse` já existe.
- Demais policies, sessão da esposa, dropdown, "Semana atual", código `*`, anciãos cadastrados em outras tabelas — inalterados.

## Verificação

- Super: cria/edita/vê evento "Esposa" no seu cronograma (badge "Esposa", sem congregações, sem toggle).
- Esposa (`wife_invite_code`): vê o evento entre os de circuito.
- Ancião cadastrado da congregação: **não vê** (RLS bloqueia).
- Ancião visitante (`código*`): **não vê** (filtro guest bloqueia).
