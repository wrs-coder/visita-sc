# Plano: app funcionando de verdade quando a internet cai sem aviso

## Correção sincera (depois do seu relato)
Você tem razão: **o problema também acontece no modo avião**, com a sincronização feita e o PIN configurado. A "internet pendurada" explica só uma parte. O código mostra três defeitos que aparecem mesmo sem internet nenhuma:

1. **Telas que apagam o que já mostravam.** Itinerário, partes do Painel e outras guardam os dados só enquanto estão abertas. Ao voltar para elas, pedem tudo de novo ao servidor. Sem internet, recebem "nada" e mostram a tela vazia. **A sincronização baixa os dados, mas essas telas nunca leem o que foi baixado.**
2. **Voltar de outro aplicativo.** O Android fecha o app quando ele fica em segundo plano. Ao reabrir, o app pergunta ao servidor quem você é. Sem resposta, grava "vazio" por cima do seu perfil guardado. Aí cai na tela de entrada ou no cadastro, ou fica girando.
3. **Esboços e Estudo** perguntam ao servidor se você é superintendente antes de abrir, mesmo com as notas já no celular.

Ou seja, as três funções existem, mas as telas e a abertura do app não usam o que elas guardam. O conserto é ligar cada tela à cópia do celular e fazer a abertura nunca depender do servidor.

## Nova regra principal (pedido seu): o celular é a fonte, o servidor só quando você pedir
Esta regra substitui o "vigia de conexão" dos itens abaixo. Com ela, não existe mais o caso de "internet ruim travando o app".

- **Todas as telas leem só do celular**: Painel, Itinerário, Congregações, Programa, Esboços, Estudo e Anotações, Notas e as demais. Abrir, sair e voltar nunca vai ao servidor.
- **Abrir o app nunca vai ao servidor.** Você entra direto com os dados guardados, inclusive ao voltar de outro aplicativo.
- **O que você cria ou altera é salvo na hora no celular** e fica marcado como "a enviar".
- **O servidor só é usado quando você toca em "Sincronizar"**, no topo e no Perfil. Esse botão envia o que você mudou e baixa o que os anciãos enviaram, tudo de uma vez.
- O botão mostra quantas alterações estão esperando e quando foi a última sincronização. Exemplo: "3 a enviar · última: ontem 19:40".
- **Exceções que precisam de internet por natureza**, e só quando você aciona: primeiro login no aparelho, criar conta, trocar senha, gerar links de convite de Grandes Eventos e enviar códigos de acesso. Nesses casos o app avisa que precisa de internet, sem travar.
- **Para os anciãos e a esposa vale a mesma regra.** Eles também têm o botão "Sincronizar" para receber o que o superintendente preparou e enviar o que preencheram.

```text
┌─────────────────────────────┐
│ ≡  Visita SC     ⟳ 3   🔔 ? │  ← ⟳ Sincronizar (3 a enviar)
│                             │
│  Toque em ⟳:                │
│ ┌─────────────────────────┐ │
│ │ Sincronizar             │ │
│ │ ↑ 3 alterações a enviar │ │
│ │ ↓ Baixar novidades      │ │
│ │ Última: ontem 19:40     │ │
│ │ [ Sincronizar agora ]   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Critério de "pronto" (o que vou provar aqui antes de te entregar)
Vou testar no **modo avião simulado**, com a sua conta e os seus dados reais baixados:
- Abrir **cada tela** do menu: todas precisam mostrar dados.
- Sair de uma tela e voltar: os dados continuam lá.
- Fechar e reabrir o app, como ao trocar de aplicativo: ele abre direto no Painel, sem pedir senha e sem tela vazia.
- Abrir um esboço de discurso: o texto completo aparece.

Te entrego a lista com cada tela marcada como aprovada ou reprovada. Nenhuma fica de fora sem você saber.

## Explicação sincera: por que nada resolveu até hoje

As três funções que já existem (Modo offline, Sincronização offline e Acesso por PIN) funcionam **só quando o celular sabe que está sem internet**: modo avião, dados desligados ou quando você liga o "Modo offline" na mão.

A queda inesperada quase nunca é assim. O caso comum é a **internet "meio caída"**:
- Wi-Fi conectado, mas sem internet (roteador da casa, Salão do Reino, hotel)
- sinal fraco de 4G/3G que "conecta" mas não traz nada
- rede que pede login (Wi-Fi público)

Nesses casos o celular continua dizendo "estou online". O app então pede os dados ao servidor e **fica esperando a resposta para sempre**. Encontrei isto no código:

1. **Os pedidos ao banco não têm limite de espera.** Só as chamadas de login têm (12 s cada, até 3 endereços ≈ 40 s). Busca de visitas, congregações e programa espera sem fim.
2. **A cópia guardada no celular só é usada depois que o pedido falha.** Como o pedido nunca falha (só fica esperando), a cópia nunca aparece. Resultado: tela em branco ou girando.
3. **Ao abrir o app**, se a preparação do dia ainda não rodou, ele espera o servidor responder com seu perfil antes de mostrar qualquer coisa. Com a internet meio caída, a bolinha gira para sempre ou volta para a tela de entrada.
4. **Ao entrar**, se a sessão expirou (passa de 1 hora parado), o app tenta renová-la e fica esperando. O PIN só aparece se ele foi criado antes. Se não foi, só sobra a senha, e a senha precisa de internet.
5. **Algumas telas não sabem ler a cópia guardada.** O Painel, Congregações, Transporte, Refeições e outras sabem. Itinerário, Programa da visita e outras ainda precisam ser conferidas uma a uma.

Mais três falhas que encontrei:
6. **Se o pedido do seu perfil falha, o app grava "vazio" por cima do perfil bom guardado.** Na próxima abertura ele acha que sua conta está incompleta.
7. **A preparação automática dos dados está desligada.** O download completo só roda no primeiro login. Se falha, falha calado.
8. **As telas de Esboços e Estudo** perguntam ao servidor quem você é antes de abrir, mesmo com as notas já no celular.

Em resumo, o problema não é só a cópia local. Ela está incompleta, e o app não percebe a tempo que a internet sumiu.

## Sobre colocar todos os dados dentro do AAB/APK (sua pergunta)

Sinceramente, isso não resolveria, e eu não recomendo:
- O AAB é gerado uma vez e enviado para a Play Store. Os dados mudam todo dia (visitas, programa, esboços). Um discurso salvo ontem não estaria no arquivo gerado na semana passada.
- O mesmo AAB vai para todos os usuários. Colocar os seus dados nele significaria entregar suas informações a qualquer pessoa que baixasse o app.

O que resolve, com o mesmo efeito que você quer: **o app baixa tudo para a memória do celular, sem exceção, e mantém essa cópia sempre em dia.**

### 0. Download completo e garantido
- Ao entrar, e depois **toda vez que houver internet** (ao abrir o app e a cada poucas horas), o app baixa **todos** os seus dados: visitas, semanas, congregações, programas, modelos, refeições, transporte, escala, recados, notas, esboços e anexos.
- Nada fica de fora por tamanho. Vou usar a memória do celular (IndexedDB), que aguenta centenas de MB.
- O app pede ao Android para **não apagar** esses dados (armazenamento persistente).
- No Perfil aparece **"Dados no aparelho: tudo baixado ✓ hoje 14:32"**, ou o que falta, com um botão **"Baixar tudo agora"**. Assim, antes de um discurso, você confere em um segundo.
- A Bíblia e as telas já ficam dentro do app hoje. Isso continua igual.

```text
┌─────────────────────────────┐
│ ‹ Perfil                    │
│ ┌─────────────────────────┐ │
│ │ Dados no aparelho       │ │
│ │ ✓ Tudo baixado          │ │
│ │   hoje às 14:32 · 38 MB │ │
│ │ [ Baixar tudo agora ]   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## O que vou fazer

### 1. "Vigia de conexão" automático (o ponto central)
- Todo pedido ao servidor ganha um **limite de espera de cerca de 6 segundos**.
- Se estourar ou falhar, o app entra sozinho em **"Sem conexão"**: as telas passam a ler direto da cópia do celular, sem esperar de novo.
- A cada 20 segundos ele testa a internet sem atrapalhar. Quando ela volta, envia o que ficou pendente e volta ao normal.
- O "Modo offline" manual continua existindo, igual a hoje.

### 2. Abrir o app sempre pela cópia do celular
- Se o aparelho já tinha uma conta conectada (você nunca tocou em "Sair"), o app abre direto com os dados guardados, **sem esperar o servidor e sem pedir PIN**.
- A verificação com o servidor passa a rodar por trás. Se ela não responder em cerca de 3 segundos, o app segue com o que tem.

### 3. Tela de entrada sem internet
- Aviso claro: "Sem internet". O botão **Entrar com PIN** passa a ser o principal.
- A senha falha rápido, com mensagem clara, em vez de girar por 40 segundos.
- Se o PIN nunca foi criado, a tela explica que ele é necessário para entrar sem internet depois de sair da conta. Um lembrete no Perfil vai sugerir criar o PIN.

### 4. Revisar todas as telas
- Vou conferir uma a uma as telas do superintendente e dos anciãos. As que ainda não leem a cópia do celular passam a ler, começando por Itinerário e Programa da visita.
- A preparação diária passa a garantir que tudo o que essas telas mostram fique guardado.

### 5. Aviso discreto no topo (estilo iOS / One UI)

```text
┌─────────────────────────────┐
│ 9:41                 ▂▄▆ 🔋 │
│ ≡  Visita SC          🔔  ? │
│ ┌─────────────────────────┐ │
│ │ ⚠ Sem conexão · usando   │ │
│ │   dados do aparelho      │ │
│ └─────────────────────────┘ │
│                             │
│  Agenda   Esboços  Visita   │
│  ┌───────────────────────┐  │
│  │ Próxima visita        │  │
│  │ Cong. Jardim Alvorada │  │
│  │ 10–16 nov             │  │
│  └───────────────────────┘  │
│  (tudo aparece normalmente) │
└─────────────────────────────┘
```

Quando a internet volta, o aviso troca por "Conectado · enviando alterações…" e some sozinho.

### Tela de entrada sem internet

```text
┌─────────────────────────────┐
│        [logo] Visita SC     │
│ ┌─────────────────────────┐ │
│ │ ⚠ Sem internet agora    │ │
│ │ Entre com seu PIN para  │ │
│ │ usar os dados guardados │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │  Wanderson (wa•••@...)  │ │
│ │   ● ● ● ○ ○ ○           │ │
│ │  [ Entrar com PIN ]     │ │
│ │  [ Usar biometria ]     │ │
│ │  Usar senha (precisa    │ │
│ │  de internet)           │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## O que não muda
- Banco de dados, regras de acesso, formato dos dados e da sincronização.
- Fila de alterações pendentes, PIN, biometria e cofre: as mesmas peças, só acionadas na hora certa.
- Nenhum plugin novo do Capacitor e nenhuma mudança de versão.

## Como vou provar que funciona (antes de dizer que está pronto)
Vou testar no navegador automatizado três situações, com conta real:
1. Internet cortada de vez com o app aberto: as telas precisam continuar com dados.
2. **Internet "pendurada"** (o servidor nunca responde, o caso real de hoje): em até cerca de 6 s precisa aparecer "Sem conexão", com os dados na tela.
3. App fechado e reaberto sem internet: precisa abrir direto no Painel com os dados.

Também vou escrever testes automáticos para cada regra.

Uma limitação, para ser honesto: o teste real no seu celular com Wi-Fi sem internet só você consegue fazer. Vou listar os passos exatos para você testar.

## Detalhes técnicos
- `connection-mode.ts`: o interceptor de fetch para o host do backend passa a usar AbortController com cerca de 6 s, inclusive no modo "online". Um novo estado automático `auto-offline` (só na memória, separado do manual) é ativado por timeout ou erro de rede. Enquanto ativo, os pedidos ao backend falham na hora (Cache Storage, depois erro sintético), como no modo manual. Um ping a cada 20 s em `/api/public/ping`, ou um HEAD leve no backend, sai do estado e chama `flushQueue`.
- `local-first.ts`: com `auto-offline` ou o modo manual ativos, lê direto do espelho, sem esperar a chamada remota.
- `use-auth.tsx`: `getSession` e `loadUserData` passam a usar `Promise.race` com cerca de 3 s. Se houver um snapshot `visita-sc:auth-profile:<uid>` e o token estiver salvo, hidrata dele e libera `loading`. Um SIGNED_OUT não deliberado continua sendo ignorado. A renovação do token roda em segundo plano.
- `LoginForm.tsx`: detecta auto-offline ou a falha do ping e mostra o banner, com PinUnlockPanel em destaque. O submit por senha ganha timeout curto e uma mensagem específica.
- Revisão das rotas que leem do backend sem `readWithMirror` (`_app.configuracoes`, `_app.programa-visita`, `_app.resumo-semana`, `checklist`, `reunioes-*` e outras). Conferir também se `offline-prefetch.ts` cobre essas tabelas.
- Um novo componente `ConnectionBanner` no `_app.tsx`, só com tokens semânticos.
- Testes com vitest: interceptor com fetch pendurado → timeout e auto-offline; `readWithMirror` em auto-offline não chama o remoto; inicialização do auth com rede pendurada libera em ≤3 s com o snapshot.
- Playwright: `page.route` pendurando as requisições do backend, `context.set_offline(True)` e reload offline.
- Uma regra no AGENTS.md: toda leitura do backend tem limite de espera, e queda detectada vira auto-offline, porque `navigator.onLine` não detecta Wi-Fi sem internet.

## Testar em casa, sem ir à zona rural
- **Botão "Simular internet ruim"** no Perfil, numa seção de teste. Ligado, o app passa a agir como na zona rural: o servidor "não responde". Você fecha e abre o app, entra nas telas, abre um esboço, e confere se tudo aparece. Depois desliga o botão.
- **Teste real, sem botão:** tire da tomada o cabo de internet do roteador e deixe o Wi-Fi ligado. O celular fica "conectado ao Wi-Fi sem internet", que é exatamente o caso da zona rural.
- **Outra forma:** ligue o roteador do celular da sua esposa com os dados móveis dela desligados e conecte o seu celular nele.
