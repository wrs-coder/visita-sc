# Menu lateral, Meu perfil em abas e visitas sem modelo

## (01) Menu lateral — "Modelos e Configurações"

```text
+---------------------------+
| MODELOS E CONFIGURAÇÕES v |
|  [=] Modelos Visitas      |  -> abre a tela única (pílulas
|  (o) Meu perfil           |     Programação…Anciãos/Pacotes)
|  [c] Apoiar desenvolvedor |
+---------------------------+
```
- Sai a sanfona "Modelos de Base"; fica um link direto "Modelos Visitas" (só superintendente) e "Meu perfil". O botão de apoio continua onde está. Só visual.

## (02) Meu perfil em abas (pílulas)

```text
+-----------------------------------------+
| Meu perfil                              |
| Wanderson · Superintendente             |
+-----------------------------------------+
| (Dados pessoais)(Recursos)(Configurações)|  <- pílulas fixas no topo
+-----------------------------------------+
| ┌─────────────────────────────────────┐ |
| │ Circuito                            │ |
| └─────────────────────────────────────┘ |
| ┌ Acesso da esposa ───────────────────┐ |
| ┌ Dados pessoais ─────────────────────┐ |
| ┌ E-mail (recuperação de senha) ──────┐ |
| ┌ Alterar senha ──────────────────────┐ |
+-----------------------------------------+
 Recursos:      Gerenciar Bíblias · Acesso sem internet (PIN) · Sincronização offline
 Configurações: Lembretes de eventos · Idioma do aplicativo · Backup e restauração
```
- Cartões com cantos arredondados e títulos discretos (estilo iOS/One UI). A aba escolhida fica lembrada no aparelho.
- Os cartões só mudam de lugar; nada do que eles fazem muda. Para ancião/convidado, cartões que hoje não aparecem continuam ocultos; abas vazias somem.

## (03) Visita sem modelo no Itinerário

```text
+-----------------------------------------+
| Itinerário                              |
| ┌─────────────────────────────────────┐ |
| │ Cong. Central       10–15 nov       │ |
| │ (!) Sem modelos                     │ |  <- selo âmbar
| └─────────────────────────────────────┘ |
| ┌ Cong. Norte   17–22 nov ───────────┐  |
+-----------------------------------------+

      +-------------------------------+
      |  (calendário)                 |
      |  Visita em 2 meses            |
      |  Cong. Central · 10 nov 2026  |
      |  Ainda sem modelo ou pacote.  |
      |                               |
      |  [ Me leve para a visita ]    |
      |  [          Ok           ]    |
      +-------------------------------+
```
- Criar/editar visita não exige mais nenhum modelo (removo as 4 travas). Se nada for escolhido, a visita é criada normalmente, sem aplicar modelo.
- Selo "Sem modelos" quando a visita não tem nenhum dos 5 modelos.
- Aviso: aparece em qualquer tela, no máximo 1x por dia, para visitas que começam dentro de 2 meses (60 dias ou menos, ainda não iniciadas) e sem nenhum modelo. Se houver ao menos um modelo, não aparece. Só para o superintendente.
- "Me leve para a visita" abre o Itinerário já com essa visita no modo editar. "Ok" fecha.

## Detalhes técnicos
- `_app.tsx`: seção `modelos` sem Collapsible; item `/modelos` com rótulo `sidebar.visitTemplates`.
- `_app.perfil.tsx`: `Tabs` shadcn com pílulas; cartões existentes movidos sem alterar lógica; aba em `localStorage` (`visita-sc:profile-tab`), lida em `useEffect` (SSR seguro).
- `_app.configuracoes.tsx`: remover validações das linhas 294–297; selo calculado pelos campos template já carregados; aceitar `?edit=<visitId>` via `validateSearch` para abrir o formulário de edição.
- Novo `src/lib/visit-template-reminder.ts` (função pura `pickVisitsNeedingTemplates(visits, hoje)` + chave diária por usuário em localStorage) com teste vitest; `VisitTemplateReminder.tsx` montado em `_app.tsx`, usando dados de visitas já em cache (offline).
- Banco e regras de acesso inalterados. i18n pt/en/es. Validar com `bunx tsgo --noEmit`, `bunx vitest run` e captura 393px.
