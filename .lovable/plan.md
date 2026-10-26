# Anciãos: abrir no Painel e ver tudo sem internet

## O que encontrei
- Ao abrir o app, só o superintendente e os anciãos com cargo (coordenador, secretário, sup. de serviço) vão para o Painel. Os demais anciãos caem em "Cronograma". O mesmo acontece logo depois do login.
- O Painel já guarda no aparelho uma cópia do que mostra (visita, cronograma, reuniões, programação dos anciãos), mas só **depois que essa tela foi aberta com internet**. O download automático em segundo plano guarda os dados em outro lugar, que o Painel não consulta. Resultado: um ancião que nunca abriu o Painel com internet vê os cartões vazios quando está sem sinal.
- Alguns cartões (refeições, transporte, designações, reuniões de campo, extras dos modelos) precisam ser conferidos um a um para garantir que todos tenham a cópia de reserva.

## O que muda (para o ancião)

```text
+-----------------------------+
| ( sem internet )    ⟳  ✉    |   <- faixa discreta "Sem conexão"
|  Painel                     |
|  [Agenda] Esboços  Visita.. |   <- mesmas 4 telas de sempre
|  +-----------------------+  |
|  | Hoje · Qua 28         |  |
|  | 10:30 Pastoreio ...   |  |   <- dados guardados no aparelho
|  | 12:00 Refeição ...    |  |
|  +-----------------------+  |
|  Próximos eventos ...       |
+-----------------------------+
```

1. Todo ancião cadastrado abre direto no Painel, com ou sem internet (também logo após o login). O "Cronograma" continua no menu.
2. Todas as informações do Painel ficam disponíveis sem internet, mesmo que o ancião não tenha aberto essa tela antes, desde que o aparelho tenha entrado com internet pelo menos uma vez.
3. Nada muda no visual, nas permissões ou no que cada um pode editar. Com internet, o comportamento continua o mesmo.

## Detalhes técnicos
- `src/routes/index.tsx` e `LoginForm.tsx`: qualquer `role === "elder"` (onboarding concluído) navega para `/dashboard`; superintendente sem mudança.
- Auditoria do `_app.dashboard.tsx` e de `useActiveVisit` / `useVisitTemplateExtras`: toda leitura passa por `readWithMirror` / `readOneWithMirror` / `readFnWithMirrorSafe`; as que ainda chamam o servidor direto ganham a reserva local, sem mudar a consulta online.
- `offline-prefetch.ts`: os passos já existentes (visitas, cronograma, refeições, transporte, designações, reuniões, programação dos anciãos) também gravam as linhas no espelho local (`upsertRows` do `local-db`), na mesma chave que o Painel lê. Continua só leitura do servidor.
- Sem mudança de banco, RLS, login, PIN ou biometria.
- Testes: ancião sem cargo vai para `/dashboard`; prefetch preenche o espelho para a visita do ancião; leitura do Painel com servidor indisponível devolve os dados do espelho. Validar com `bunx tsgo --noEmit` e `bunx vitest run`, e Playwright offline (contexto `offline=True`) com sessão de ancião.
