# Abas de modelos, "Perguntas", correção em Anciãos e revisão de acessos

## (01) Nova ordem e nomes das abas

```text
+-----------------------------------+
| (Pacotes)(Programação)(Campo)     |
| (Reuniões)(Anciãos)(Perguntas)    |
+-----------------------------------+
```
- "Discursos" passa a se chamar **Reuniões**; "Checklist" passa a se chamar **Perguntas**.
- Os endereços das telas não mudam, então visitas, pacotes e atalhos continuam funcionando.

## (02) Aba Perguntas

```text
+-----------------------------------+
| (Pacotes)(Programação)(Campo)...  |
|                                   |
| Perguntas para os anciãos         |
| Adicione perguntas que gostaria   |
| de saber a resposta do corpo de   |
| anciãos                           |
|                                   |
| (+ Novo v) [ Visita Jan 2026 v ](⋮)|
| 1. [ pergunta ............. ]     |
+-----------------------------------+
```
Só o título e a frase mudam (português, inglês e espanhol). Os itens salvos continuam os mesmos.

## (03) Anciãos: modelos não aparecem

Causa confirmada no código: a tela carrega a lista, mas não escolhe nenhum modelo ao abrir. O seletor fica vazio e o cartão mostra "selecione ou crie", dando a impressão de que os dois modelos sumiram. As outras telas já escolhem o primeiro modelo automaticamente.

Correção: ao abrir a tela, o primeiro modelo da lista é escolhido. Depois de excluir um modelo, o app escolhe o próximo.

Investigação de vínculo com as visitas (só leitura, nada é apagado):
- Conferir no banco se cada visita com modelo de Anciãos aponta para um modelo que ainda existe e pertence ao mesmo superintendente.
- Conferir se as visitas já criadas guardaram sua própria cópia do programa, para que alterar ou excluir um modelo não mude visitas antigas.
- Conferir se os pacotes apontam para modelos de Anciãos que ainda existem (o aviso "modelo ausente" já cobre isso).
- O resultado será relatado. Se alguma visita estiver apontando para um modelo inexistente, eu aviso antes de qualquer correção.

## (04) Revisão de acessos (sem mudar regras)

Vou conferir, sem alterar permissões:

| Perfil | Deve ver | Deve editar |
|---|---|---|
| Superintendente | tudo | modelos, visitas, itinerário |
| Comissão de serviço | visita da congregação | o que já edita hoje |
| Corpo de anciãos | visita (aba anciãos com senha) | nada novo |
| Esposa | o que já vê + espaço pessoal | só o próprio espaço |

Como vou conferir:
- Telas de modelos e pacotes: confirmar que só o superintendente consegue abrir e salvar.
- Regras de acesso no banco das tabelas de modelos e de `itinerary_weeks`: só leitura.
- Criação de conta (superintendente, ancião) e login (incluindo o da esposa): conferir que nenhuma mudança recente afetou esses fluxos e rodar os testes que já existem.
- Vou relatar qualquer falha encontrada. Falhas em login, PIN ou biometria só serão corrigidas se você pedir.

## Detalhes técnicos
- `TemplatesTabs.tsx`: reordenar `TEMPLATE_TABS` e trocar os rótulos.
- i18n: novos `templates.checklist.title/subtitle`.
- `_app.modelo-programacao-ancioes.tsx`: em `loadList`, definir `activeId` como o primeiro modelo quando estiver vazio ou apontar para um modelo inexistente.
- Consultas somente leitura: `visits.elder_program_template_id` contra `elder_program_templates`, uso de `template_snapshot`, e políticas de acesso via `pg_policies`.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px.
