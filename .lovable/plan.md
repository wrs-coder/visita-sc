# Plano final: o app funciona todo pelo celular, sem depender da internet

## Por que hoje falha (resumo sincero)
O app foi feito para buscar os dados no servidor e só usar a cópia do celular quando o servidor falha. Na prática:
- Várias telas (Itinerário, partes do Painel e outras) **não leem a cópia do celular**. Sem internet, elas ficam vazias, inclusive ao sair e voltar.
- Ao **voltar de outro aplicativo**, o app pergunta ao servidor quem você é. Sem resposta, grava "vazio" no seu perfil e cai na tela de entrada.
- Esboços e Estudo também consultam o servidor antes de abrir.
- Com "internet pendurada", o app espera o servidor sem limite.

## O que será feito (5 itens)

**1. Celular primeiro, sempre.** Todas as telas passam a ler só do celular: Painel, Itinerário, Congregações, Programa, Esboços, Estudo e Anotações, Notas e as demais. Abrir, sair e voltar nunca vai ao servidor. Sem pedido ao servidor, nem o modo avião nem a "internet pendurada" conseguem travar o app.

**2. Abrir o app sem servidor.** O app abre direto com os dados guardados, inclusive depois de trocar de aplicativo. Ele não grava mais "vazio" por cima do seu perfil.

**3. Botão ⟳ Sincronizar no topo** (é a "Sincronização offline" melhorada). Só ele vai ao servidor: envia o que você mudou e baixa tudo, sem exceção. Mostra quantas alterações faltam enviar e "Tudo baixado ✓" com a data e a hora. O que você salva fica no celular até sincronizar.

**4. As três funções de hoje:**
- O **Modo offline** (interruptor) sai, porque não faz mais falta.
- A **Sincronização offline** vira o botão ⟳.
- O **PIN e a biometria** continuam iguais, para entrar sem internet depois de tocar em "Sair".

**5. Botão "Simular internet ruim"** no Perfil, para você testar em casa antes de ir à zona rural.

```text
┌─────────────────────────────┐
│ ≡  Visita SC     ⟳ 3   🔔 ? │  ⟳ = Sincronizar (3 a enviar)
│ ┌─────────────────────────┐ │
│ │ Sincronizar             │ │
│ │ ↑ 3 alterações a enviar │ │
│ │ ✓ Tudo baixado          │ │
│ │   ontem às 19:40        │ │
│ │ [ Sincronizar agora ]   │ │
│ └─────────────────────────┘ │
│  Agenda   Esboços  Visita   │
│  (dados sempre na tela)     │
└─────────────────────────────┘
```

## Preciso da sua autorização (instructions.md, regra 13)
O app passa a **abrir sem pedir PIN se você nunca tocou em "Sair"** neste aparelho. Depois de "Sair", o PIN continua obrigatório, como hoje. O login com senha não muda.

## O que não muda
Banco de dados, regras de acesso, login com senha, PIN, fila de envio, versão do app. Nenhum plugin novo.

## Como vou provar antes de entregar
Com a sua conta, vou simular o modo avião e a internet pendurada e conferir:
- abrir todas as telas
- sair e voltar
- fechar e reabrir o app
- abrir um esboço

Te entrego a lista com cada tela aprovada ou reprovada.

## Detalhes técnicos
- As leituras das rotas (`configuracoes`, `dashboard`, `congregacoes`, `programa-*`, `cronograma`, `consideracoes-campo`, `estudo-pessoal` etc.) passam a usar TanStack Query com uma queryFn que lê o espelho `local-db` e o cache persistido. Não há chamada remota na leitura, e o refetch automático fica desligado.
- `runFullSync` (local-sync) passa a ser o único caminho remoto: envia a fila (`flushQueue`) e baixa todas as tabelas e os resultados das server functions usados pelas telas. Ao terminar, invalida as queries. Um carimbo "último download completo" fica por usuário. `navigator.storage.persist()` é chamado.
- `use-auth.tsx`: hidrata do snapshot e da sessão salvos, sem esperar `getSession` ou `loadUserData`. A verificação remota só acontece na sincronização, e um erro remoto nunca sobrescreve o snapshot.
- Os guards de `consideracoes-campo` e `estudo-pessoal` passam a usar o `role` do AuthProvider.
- O interceptor de fetch ganha um timeout de cerca de 8 s para as chamadas acionadas pelo usuário. O interruptor de Modo offline sai da interface, e quem estava com o modo ligado tem o estado convertido de forma segura.
- O simulador de internet ruim fica em localStorage e faz o interceptor pendurar ou falhar os pedidos ao backend.
- Testes com vitest para a leitura local sem rede, para o snapshot que não é sobrescrito e para a sincronização. Teste com Playwright em `set_offline` e com rotas penduradas. Uma regra nova no AGENTS.md.
