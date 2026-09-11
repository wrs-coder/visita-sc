# App instalado 100% local, com endereço de dados dinâmico

## Resposta curta

Sim, é possível — e é a melhor arquitetura a longo prazo. Mas não é um ajuste pequeno: são três mudanças estruturais. Abaixo, o que muda, o que ganha e onde estão os riscos reais.

Sobre a queda: testei agora os três endereços e todos responderam normalmente. A falha que você viu foi momentânea; o problema de fundo é o app apontar para um único endereço fixo.

## O que precisa mudar

1. **Gerar uma versão "casca local" do app.** Hoje o site é renderizado no servidor, então não existe um arquivo inicial pronto para ficar dentro do celular. Vou ativar o modo de casca estática (SPA shell): o build passa a produzir também um `index.html` completo que roda offline no aparelho. O site no navegador continua funcionando como hoje.

2. **Endereço de dados dinâmico.** Todas as chamadas ao servidor passam a usar um endereço escolhido em tempo de execução: no navegador, o próprio endereço da página; no aplicativo, o primeiro dos três endereços que responder (com preferência pelo último que funcionou). Se um cair, ele tenta o seguinte automaticamente — sem recarregar o app e sem deslogar.

3. **Liberar o acesso entre origens.** Como o app passa a rodar localmente e falar com um servidor remoto, o servidor precisa autorizar explicitamente essas chamadas vindas do aplicativo.

## O que você ganha

- O app abre sempre, mesmo sem internet (tela, menus e dados em cache).
- Nunca mais tela branca por causa de um endereço fora do ar.
- Login preservado: a sessão passa a ficar no próprio aplicativo, não presa a um domínio.
- Troca de endereço invisível para o usuário.

## Riscos (honestamente)

| Risco | Gravidade | Como reduzo |
|---|---|---|
| Autorização entre origens mal configurada → app não carrega dados | Alta se errar | Configuração central única, testada no preview antes de gerar o AAB |
| Alguma tela depender de renderização no servidor e quebrar na casca local | Média | Revisar as 20 áreas que usam servidor; a maioria já roda no cliente |
| Sessão de login precisa ser refeita uma vez após atualizar o app | Baixa | Avisar na tela de boas-vindas |
| Endereços de compartilhamento/PDF/links apontando errado | Baixa | Centralizar a origem numa única função |
| Só dá para validar 100% depois de gerar o APK de teste | Média | Gerar primeiro um APK de teste interno antes de enviar à Play |

Nada disso afeta o site no navegador, o banco de dados, os dados já salvos ou as contas existentes.

## Ordem de execução (segura, em etapas)

1. Centralizar a origem das chamadas + fallback dinâmico (funciona já no site, sem risco).
2. Autorizar as chamadas vindas do aplicativo no servidor.
3. Ativar a casca local e remover o endereço fixo do empacotamento.
4. Subir a versão para 4.1.0 (`versionCode` 3) e gerar um APK de teste interno.
5. Só depois: AAB para a Play Store.

## Detalhes técnicos

- **Origem dinâmica**: novo `src/lib/api-origin.ts` com `getApiOrigin()`. No web devolve `window.location.origin`; no app nativo (`Capacitor.isNativePlatform()`) faz sonda `HEAD/GET /manifest.webmanifest` com `AbortController` (~4s) na ordem: origem memorizada em `localStorage` → `www.visitasc.com.br` → `visitasc.com.br` → `visita-sc.lovable.app`.
- **Injeção no TanStack**: `createStart` aceita `serverFns.fetch`. Registro em `src/start.ts` um fetch que, quando a URL é relativa e a plataforma é nativa, prefixa `getApiOrigin()` e usa `credentials: 'omit'` (a autenticação já vai por bearer via `attachSupabaseAuth`). Confirmado no runtime instalado: `createClientRpc` monta `process.env.TSS_SERVER_FN_BASE + functionId` e delega para `getStartOptions()?.serverFns?.fetch`. Em falha de rede, a mesma camada reordena e repete uma vez na próxima origem.
- **CORS**: `requestMiddleware` em `src/start.ts` responde `OPTIONS` e adiciona `Access-Control-Allow-Origin` para uma allowlist (`https://localhost`, `capacitor://localhost` e os 3 domínios), com `Allow-Headers: authorization, content-type, x-tss-*` e `Vary: Origin`. Supabase já aceita chamadas diretas do cliente.
- **Casca local**: habilitar `spa: { enabled: true }` (prerender do shell) na config do TanStack Start, apontar `webDir` do Capacitor para a saída do cliente e remover `server.url` do `capacitor.config.ts`, mantendo `androidScheme: 'https'` e `allowNavigation` para os 3 domínios + `*.supabase.co`.
- **Sessão**: com origem `https://localhost` no WebView, o `localStorage` do Supabase passa a ser do app — sessão estável e independente do domínio de dados.
- **Versão**: `android/app/build.gradle` → `versionCode 3`, `versionName "4.1.0"`; `package.json` alinhado.
- **Sem mudanças** em: banco, RLS, migrations, timer, popups bíblicos, anexos, PDFs e fila offline.
