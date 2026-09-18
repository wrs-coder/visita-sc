# Entrada e dados sem internet (Offline-First)

Sim, é possível — e dá para fazer sem mexer no que já funciona hoje para quem está online. A proposta abaixo entrega entrada por PIN de 6 dígitos (com digital onde houver), validade de 30 dias sem nenhuma conexão, e download completo apenas quando o usuário pedir.

## Quem já tem conta

Nada quebra e ninguém precisa recriar conta. Na próxima vez que a pessoa entrar **com internet**, o app mostra uma tela curta: "Criar PIN de acesso offline (6 dígitos)" com a opção "Agora não". Quem criar passa a poder entrar sem internet; quem pular continua exatamente como hoje e pode criar o PIN depois em Configurações. Sem PIN criado, o comportamento atual é preservado byte a byte.

## Como o acesso offline vai funcionar

1. Entrada com internet (como hoje) → o app guarda no aparelho, criptografado, a credencial de sessão do usuário e o retrato do perfil (nome, papel, congregação).
2. O PIN não é guardado: ele gera a chave que abre esse cofre. PIN errado não abre nada.
3. Sem internet, a tela inicial mostra "Entrar com PIN" (ou digital) e libera o app com todos os dados já baixados.
4. Ao voltar a internet, a sessão é renovada em silêncio e o prazo de 30 dias reinicia.
5. Passados 30 dias sem nenhuma conexão, o app pede uma entrada com internet uma única vez.
6. Proteções: 5 tentativas erradas de PIN → espera progressiva; 10 erradas → o cofre é apagado (os dados na nuvem continuam intactos); "Sair" apaga o cofre do aparelho.

## Importante sobre a senha

A senha da conta **não** ficará gravada no celular, nem criptografada. Guardar senha no aparelho é o único ponto do pedido que criaria risco real (quem tivesse o aparelho poderia extraí-la e usá-la na web). O PIN entrega o mesmo resultado prático — entrar sem consultar o servidor — sem esse risco. Recomendo fortemente esta troca, e o plano está escrito assim.

## Dados disponíveis offline

- O download completo (todas as congregações e semanas às quais o usuário tem acesso) continua acionado pelo botão Sincronizar, como hoje, conforme sua escolha.
- Após entrar por PIN, todas as páginas leem do cache local já existente; nenhuma tela fica em branco por falta de rede.
- Esboços, anexos e textos bíblicos continuam no mecanismo atual, sem alteração.
- Alterações feitas offline seguem para a fila já existente e sobem quando a rede volta.

## Detalhes técnicos

- Novo `src/lib/offline-credentials.ts`: cofre em IndexedDB com AES-GCM (WebCrypto), chave derivada do PIN por PBKDF2-SHA256 (≥210k iterações, salt aleatório por aparelho). Guarda `refresh_token`/`access_token` do Supabase, `userId` e o snapshot de `auth-profile`. Campos: `createdAt`, `lastOnlineAt`, `failedAttempts`.
- Desbloqueio: abre o cofre → `supabase.auth.setSession(...)`. Com rede, tenta `refreshSession()`; sem rede, o app opera em Modo Offline com a sessão local, sem chamadas ao servidor.
- Validade: `Date.now() - lastOnlineAt > 30d` invalida o cofre e cai no login normal.
- Biometria: `capacitor-native-biometric` apenas como atalho que libera o PIN guardado no Keystore/Keychain; o PIN continua sendo o caminho garantido. Na web, o botão simplesmente não aparece.
- `use-auth.tsx`: novo caminho de hidratação a partir do cofre antes de `getSession()`, sem tocar no fluxo online existente; isolamento por `ensureLocalDataOwner` mantido (trocar de conta apaga cofre e caches).
- `LoginForm.tsx`: bloco "Entrar com PIN" exibido só quando existe cofre para o aparelho; o formulário atual permanece intacto.
- Novo diálogo de criação/alteração de PIN em `_app.perfil.tsx` e no primeiro login online.
- `offline-prefetch.ts` / `use-offline-warmup.ts`: sem mudança de gatilho (continua manual); apenas ampliação do passo de congregações para cobrir todas às quais o usuário tem acesso.
- Sem migração de banco, sem mudança de RLS, sem novos segredos.

## Riscos e como são contidos

| Risco | Contenção |
| --- | --- |
| Aparelho perdido com cofre aberto por PIN fraco | Limite de tentativas + autodestruição do cofre; sem senha guardada |
| Token de sessão em repouso no aparelho | Criptografado; só decifra com o PIN; expira em 30 dias |
| Regressão no login de quem já usa | Caminho novo é aditivo e só ativa com cofre existente |
| Esboços/Bíblia afetados | Nenhum arquivo desses módulos é alterado |
| Cache de outra conta vazar | Reaproveita o isolamento por usuário já existente |

## Entrega em etapas

1. Cofre criptografado + criação de PIN (com internet) + entrada por PIN.
2. Prazo de 30 dias, limites de tentativa, gerenciar/remover PIN em Configurações.
3. Biometria como atalho e ampliação do download para todas as congregações.

Cada etapa fecha com verificação de tipos e build, e o fluxo online atual é testado antes de seguir.
