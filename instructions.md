# DIRETRIZES OBRIGATÓRIAS DE ARQUITETURA - VISITA SC

## 1. Regras de Roles (Perfis de Utilizador)

- O 'superintendent' (Superintendente) gerencia o circuito e NÃO possui uma congregação fixa atrelada ao seu perfil. O circuito ativo dele é definido dinamicamente pelas datas do Itinerário.
- Os 'anciaos' (Anciãos locais) possuem uma congregação fixa vinculada ao seu perfil.
- NUNCA bloqueies uma tela para o Superintendente sob o pretexto de falta de congregação fixa. Se o utilizador for Superintendente, exibe seletores (dropdowns) para ele escolher a congregação ou herda o contexto do Itinerário.

## 2. Padrão de Modelos (Templates) e Itinerário

- O aplicativo segue o padrão de criação de "Modelos" neutros na nuvem.
- A vinculação dos Modelos deve ser feita OBRIGATORIAMENTE no momento da criação ou edição da visita na aba Itinerário. Não existem campos opcionais para modelos aqui. A escolha é estritamente obrigatória para conseguir validar e criar a visita.
- Ao aplicar um modelo, os dados devem ser copiados para a tabela de destino da visita, respeitando as permissões de edição de ambos os perfis (Superintendente e Anciãos).
- Na sub-aba "Pioneiros" dos modelos, o campo de data deve usar apenas o Dia da Semana (Dropdown) e Horário (Time Picker), sem calendário numérico de datas específicas (Ex: "Sábado, 10:30").
- Na sub-aba "Fim de Semana", o modelo deve permitir múltiplos temas de discursos, gerando um dropdown (lista suspensa) para os anciãos escolherem na aba final da congregação.
- Todos os modelos devem ter a opção de "duplicar modelo".

## 3. Segurança e RLS (Supabase)

- Todas as tabelas que envolvem registros de congregações (como 'talk_themes', 'meeting_templates', etc.) DEVEM possuir políticas de RLS que permitam explicitamente que a role 'superintendent' faça INSERT, UPDATE, SELECT e DELETE em qualquer registro do seu circuito.
- Antes de gerar qualquer alteração de código que envie dados ao servidor, certifica-te de que as tabelas e políticas de RLS acompanham a permissão do Superintendente para evitar o erro "new row violates row-level security policy".

## 4. Persistência Local (Rascunho)

- Telas de preenchimento complexo (como Reuniões e Discursos) devem utilizar salvamento automático em localStorage (por usuário e congregação) como rascunho.
- O envio real para o banco de dados (Supabase) só deve ocorrer após o clique explícito no botão "Salvar dados".

## 5. Regras do Itinerário e Painel Inicial (Dashboard)

- A aba "Itinerário" é um calendário livre de planejamento anual. É proibido limitar o cadastro a 3 congregações ou usar indicadores/botões de "congregação ativa" dentro dela.
- O Painel Inicial (Dashboard) do Superintendente deve manter o layout moderno de blocos elegantes (cards) para o resumo do dia atual (Refeições, Transporte, Estudos/Revisitas e Reunião de Campo).

## 6. Integridade Modelos ↔ Visitas (Congregações)

- Toda coluna nova em tabela `*_template_*` deve ter par equivalente em `VisitTemplateExtras` (`src/lib/visit-template-extras.functions.ts`) e ser carregada nos snapshots da visita.
- Os snapshots `src/lib/visit-summary.functions.ts` e `src/lib/guest.functions.ts` devem ser revisados em conjunto a cada mudança de modelo — eles alimentam Resumo do Dia, Dashboard, acesso Anciãos/ESC e acesso Esposa do Superintendente.
- Ordem obrigatória ao alterar um modelo: migration → Zod schema do serverFn → função `upsert*` → import/export → `VisitTemplateExtras` → UI do modelo → painel da congregação → `VisitSummaryView` → Dashboard → i18n (pt/en/es).
- Campos editáveis só pelo Superintendente seguem `readOnly={!isSuper}` e o `editorHint` de "somente leitura" deve ser ocultado quando `isSuper === true`. NUNCA exibir mensagem de bloqueio para o Superintendente.

## 7. Banco de Dados e Segurança Server-Side

- Toda `CREATE TABLE` no schema `public` exige bloco `GRANT` explícito na mesma migration (authenticated/service_role; anon só com política pública), antes de `ENABLE ROW LEVEL SECURITY` e `CREATE POLICY`.
- Escritas sensíveis sempre via `createServerFn` com `supabaseAdmin`. Proibido `supabase.from().insert/update/delete` direto no cliente para dados compartilhados entre papéis.
- Validação `Zod` obrigatória em `.inputValidator()` de todo serverFn, com `min/max` e regex quando aplicável.
- Proibido `CHECK` constraint com funções voláteis (`now()` etc.) — usar trigger de validação.
- Proibido tocar nos schemas reservados: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- Roles sempre em tabela separada `user_roles` consumida via função `has_role` SECURITY DEFINER. Nunca em `profiles`.

## 8. Arquitetura TanStack Start

- Lógica de servidor da aplicação vive em `createServerFn` (`src/lib/*.functions.ts`). NÃO criar novas Supabase Edge Functions.
- Proibido importar `*.server.ts` no código cliente.
- `process.env` só pode ser lido dentro de `.handler()` — nunca em escopo de módulo.
- ServerFn protegido por `requireSupabaseAuth` nunca pode ser chamado em `loader` de rota pública; usar `useServerFn` + `useQuery`, ou colocar a rota sob `_authenticated/`.
- Confirmar que `src/start.ts` mantém `attachSupabaseAuth` em `functionMiddleware` ao mexer em serverFns autenticados.

## 9. Estado, Cache e Offline-first

- Preservar a fila de sync offline (`use-outlines-sync` e similares). Todo novo campo persistido entra no mesmo padrão de cache local + sync.
- Não introduzir `useEffect + fetch` para dados iniciais — usar `ensureQueryData` no loader + `useSuspenseQuery` no componente.
- Após qualquer mutação que afete Resumo do Dia, Dashboard ou painéis de papéis, invalidar as queries relacionadas (`queryClient.invalidateQueries`).
- Rascunho em localStorage continua sendo o padrão das telas complexas (regra 4); persistência real só ao clicar "Salvar dados".

## 10. Internacionalização

- Toda string nova em UI exige chave nas três locales (`src/i18n/locales/pt.json`, `en.json`, `es.json`) na mesma alteração.
- Manter a mesma estrutura de chave (ordem e aninhamento) entre os três arquivos para facilitar diff.
- Alteração que adiciona/remove campo de modelo deve também remover as chaves i18n obsoletas.

## 11. Checklist Obrigatório antes de Finalizar

Antes de encerrar qualquer mudança que toque modelos, papéis ou visitas, confirmar:

1. Migration + `GRANT`s aplicados.
2. Zod schema (server) e tipos TS (cliente) coerentes.
3. `VisitTemplateExtras` + snapshots (`visit-summary`, `guest`) atualizados.
4. UI do modelo, painel da congregação, Resumo do Dia e Dashboard refletem o campo.
5. `isSuper` libera edição sem mensagem de "somente leitura".
6. i18n pt/en/es completas e simétricas.
7. Sync offline e invalidação de queries cobertas.
8. Build passa sem erro de tipo.

## 12. Anti-padrões Proibidos

- Adicionar campo em modelo sem propagar para a visita.
- Mostrar mensagem de "somente leitura" para o Superintendente.
- Duplicar lógica de horário/dia entre tabelas — usar sempre o helper central `resolveDate(weekday, time)`.
- Criar rota nova sem `errorComponent` e `notFoundComponent`.
- Hardcode de cores/fontes fora de `src/styles.css` (usar tokens semânticos).
- Bloquear telas do Superintendente por ausência de congregação fixa (reforço da regra 1).

## 13. Acesso sem Internet (PIN e Biometria)

- A senha da conta NUNCA é guardada no aparelho. O cofre local (`src/lib/offline-credentials.ts`) guarda apenas sessão (access/refresh token) e o retrato de perfil, cifrados com AES-GCM.
- Formato v2 obrigatório: `contentKey` aleatória de 256 bits cifra o conteúdo; a `contentKey` é embrulhada pela chave derivada do PIN (PBKDF2-SHA256, mínimo 210.000 iterações) e pode ser guardada no cofre nativo liberado por digital/rosto.
- PIN é sempre de 6 dígitos e continua sendo o caminho garantido de recuperação; biometria é apenas atalho e nunca pode ser a única forma de abrir o cofre.
- Validade de 30 dias sem contato com o servidor; 5 erros iniciam espera progressiva; 10 erros destroem o cofre. Logout explícito apaga cofre, chave nativa e sessão local.
- Nenhuma tela de entrada pode ficar presa esperando o servidor: toda restauração de sessão tem verificação de rede e limite de tempo, caindo para Modo Offline.
- Com o cofre aberto e o servidor inacessível, o app reconhece o usuário pela sessão local (`src/lib/offline-session.ts`) + snapshot `visita-sc:auth-profile:<uid>`. A sessão real do servidor sempre tem prioridade.
- Diálogos de criação/ativação fecham imediatamente após a confirmação do PIN; a ativação da biometria acontece depois, com aviso próprio.
- Proibido alterar o fluxo de login online (usuário/senha) ao mexer nesses recursos.

## 14. Conexão do Aplicativo Instalado (APK/AAB)

- A casca Capacitor é local (`webDir: dist-app`); chamadas ao servidor no app nativo usam o transporte HTTPS nativo (`src/lib/native-http.ts`), nunca dependem de CORS/preflight do WebView.
- Lista fixa de destinos permitidos: `visitasc.com.br`, `www.visitasc.com.br` e `visita-sc.lovable.app`, somente HTTPS. Redirecionamento só é aceito entre esses hosts.
- IDs de Server Function devem ser gerados de forma portável (`src/lib/server-function-id.ts`), iguais no Windows e no Linux.
- `scripts/build-app-shell.mjs` valida, antes de empacotar, o marcador do transporte nativo e o hash da Server Function de login. Falha na validação impede gerar o pacote.

## 15. Versionamento do Aplicativo

- Toda mudança de versão altera, na mesma alteração: `package.json`, `APP_VERSION` em `src/components/auth/LoginForm.tsx` e `versionName`/`versionCode` em `android/app/build.gradle`.
- `versionCode` sempre incrementa; `versionName` segue semver e é o número exibido na tela "Sobre".

  ## 16. Diretrizes de Execução Cirúrgica e Blindagem contra Regressões

- PROIBIÇÃO DE SUPOSIÇÃO DE DEPENDÊNCIAS: Jamais importar pacotes nativos (@capacitor/*) ou bibliotecas npm sem antes verificar se constam no `package.json` e se estão sincronizados na ponte Android. Se faltar pacote, instalar formalmente antes de usar.
- BUSCA OBRIGATÓRIA DE CONSUMIDORES: Ao adicionar ou alterar propriedades em componentes compartilhados (como `FieldNoteInfoButton`, `FoldCard`, diálogos de tela cheia ou botões de resumo), fazer busca obrigatória em todo o projeto (`rg`) e garantir que todos os arquivos que os utilizam recebam as propriedades necessárias (ex.: `onSync`, `syncing`).
- ISOLAMENTO DE ARQUIVOS VITAIS: Proibido alterar `src/routes/__root.tsx`, `src/lib/auth.functions.ts` ou provedores de sessão para atender pedidos de telas específicas, cartões ou ajustes visuais.
- ALARMES E NOTIFICAÇÕES NÃO INTRUSIVOS: Proibido emitir avisos globais (como "Sessão expirada") em eventos de retorno de tela (`visibilitychange`/`resume`) sem antes verificar se o usuário é acesso por código (esposa/anciãos), se está offline intencional ou se a fila de sincronização está vazia (`queueSize() === 0`).
- ESCOPO CIRÚRGICO: Limitar as edições estritamente aos arquivos e componentes citados no pedido. Proibido refatorar ou reorganizar código funcional adjacente.

## 17. Padrões Visuais Premium e Sistema de Cores

- ZERO CORES INLINE: Proibido o uso de códigos hexadecimais soltos ou utilitários hardcoded (`text-white`, `bg-[#...]`). Todas as cores devem seguir rigorosamente os tokens semânticos em `src/styles.css` (sistema de tokens da Onda 6.8).
- MODO ESCURO E OLED: Todo texto em elementos de destaque (`mark`, `.bible-highlight`) deve manter contraste escuro legível (`--highlight-ink`), garantindo legibilidade perfeita nos dois modos escuros (grafite e preto puro).
- SOBRIEDADE E ALINHAMENTO: Proibida poluição visual por informações redundantes (ex.: repetir no cabeçalho a data que já está nas pílulas de navegação). Manter silhuetas limpas e alturas uniformes.

## 18. Plataforma Nativa e Dispositivos Móveis (Android / Capacitor)

- DETECÇÃO NATIVA RESILIENTE: Sempre priorizar a detecção via `window.Capacitor?.isNativePlatform?.()` e ler diretamente os objetos nativos `window.Capacitor.Plugins.*` antes de recorrer a imports dinâmicos que possam falhar silenciosamente no WebView.
- HIERARQUIA DO BOTÃO VOLTAR NATIVO: Ao pressionar o botão voltar no smartphone, a ordem de prioridade é obrigatória:
  1. Fechar diálogos, modais, popups ou telas cheias abertas (via evento Escape).
  2. Se nenhuma sobreposição estiver visível, navegar no histórico da rota (`router.history.back()`).
  3. Somente na tela inicial do app, solicitar confirmação ("Toque novamente para sair") antes de fechar o aplicativo.

## 19. Protocolo de Validação Obrigatória

- Todo ciclo de alterações deve obrigatoriamente passar na checagem de tipos (`bunx tsgo --noEmit` ou `bunx tsc --noEmit`) e na suíte de testes (`bunx vitest run`) com 100% de aprovação antes de qualquer entrega.

## 20. Protocolo de Planeamento e Raciocínio (Anti-Alucinação)

- **THINKING FIRST (Pensar Antes de Agir):** Antes de escrever ou alterar qualquer linha de código, listar explicitamente quais arquivos serão alterados, qual é a dependência entre eles e qual será o impacto dessa mudança no fluxo offline e no banco de dados.
- **PROIBIÇÃO DE ALTERAÇÕES FANTASMAS:** É estritamente proibido refatorar, renomear ou reorganizar código, componentes ou funções que não estejam diretamente relacionados à tarefa solicitada. Se uma função adjacente funciona, não deve ser tocada.

## 21. Tratamento de Erros e Fallbacks (Defesa de UI)

- **FIM DOS CATCHES SILENCIOSOS:** É proibido usar blocos `catch { }` ou `catch (e) { return null; }` sem registrar o erro no console (ex: `console.error('[Módulo] Erro:', err)`) e sem tratar o estado da interface. Erros invisíveis dificultam o debug.
- **MUTAÇÕES NÃO BLOQUEANTES:** Ao salvar dados locais ou remotos, a UI não pode "congelar". Utilizar atualizações otimistas (_Optimistic Updates_) do TanStack Query ou estados visuais claros de carregamento (`isPending`/`isSaving`).
- **FALLBACK PARA FUNCIONALIDADES NATIVAS:** Qualquer chamada ao `window.Capacitor.Plugins` deve prever o cenário em que o plugin não carrega a tempo ou o usuário está na Web. A aplicação não pode quebrar; deve desativar a ação ou exibir um aviso amigável ("Função disponível apenas no aplicativo instalado").

## 22. Integridade de Tipos e Zod (Blindagem de Dados)

- **TOLERÂNCIA ZERO PARA `any` E `@ts-ignore`:** Não resolver erros de TypeScript mascarando o tipo. A interface, o schema do banco de dados ou o Zod Validator devem ser corrigidos na raiz.
- **SINCRONIA TOTAL ZOD ↔ TYPESCRIPT:** Sempre que um Zod Schema (`z.object`) for alterado em um Server Function, o tipo TypeScript correspondente (`type MyModel = z.infer<typeof schema>`) deve ser atualizado e verificado em todos os componentes de UI que o consomem.

## 23. Gestão de Estado e Re-renderizações

- **USO ESTRITO DE HOOKS:** Proibido introduzir novos `useEffect` para sincronização de dados ou chamadas de API. Toda a gestão de estado assíncrona deve ser feita estritamente através do TanStack Query (`useQuery`, `useMutation`, `useSuspenseQuery`).
- **INVALIDAÇÃO CIRÚRGICA:** Ao realizar um `mutation` (ex: apagar uma visita, atualizar um modelo), identificar exatamente quais chaves (QueryKeys) precisam de invalidação (`queryClient.invalidateQueries`) para evitar que a UI mostre dados fantasmas sem exigir o recarregamento da página.

## 24. Prevenção de Código "Morno" (Half-baked features)

- **ENTREGA DE PONTA A PONTA:** Uma nova funcionalidade só é considerada pronta se incluir obrigatoriamente:
  1. Zod Schema e Tipagem estrita.
  2. Função Server-side (ServerFn) ou lógica de persistência local adequada.
  3. UI implementada com os tokens de cor do projeto (`src/styles.css`).
  4. Chaves de tradução (i18n) configuradas em PT, EN e ES.
  5. Tratamento de fallback para estado offline (sem internet).
- **LIMITAÇÃO DE ESCOPO POR RESPOSTA:** Se a limitação do tamanho da resposta impedir a entrega completa, parar a geração, entregar a lógica de backend/dados e pedir permissão explícita para continuar a UI na próxima iteração.

## 25. Gatilho Obrigatório de Interação (Workflow com IA)

- **PARADA PARA APROVAÇÃO:** Em pedidos complexos que envolvam arquitetura, banco de dados ou alteração de modelos, revisar as regras 11, 16 e 20, gerar um plano de ação passo a passo e **aguardar a autorização do usuário** antes de gerar qualquer bloco de código.
