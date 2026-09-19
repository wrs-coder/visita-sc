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

