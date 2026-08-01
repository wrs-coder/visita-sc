## Caminho seguro para o AAB de release

Servidor principal permanece em `https://visita-sc.lovable.app` (`capacitor.config.ts` intocado). Nenhuma server function, fluxo Supabase ou arquivo de PWA é alterado.

## 1. Assinatura release permanente — `android/app/build.gradle`

- Carregar `android/keystore.properties` no topo do arquivo (`Properties` + `FileInputStream`, só quando o arquivo existir).
- Adicionar `signingConfigs { release { keyAlias / keyPassword / storeFile / storePassword } }` dentro de `android { }`.
- Em `buildTypes.release`, aplicar `signingConfig signingConfigs.release` **condicionado à existência do `keystore.properties`** — assim quem clona o repositório sem a keystore ainda consegue compilar.
- `minifyEnabled false` mantido, com comentário explicando o motivo (evitar regressão de R8/ProGuard nesta submissão).
- Acrescentar `keystore.properties` e `app/*.keystore` ao `android/.gitignore`.

## 2. Rota de Política de Privacidade

Novo arquivo `src/routes/politica-privacidade.tsx`:

- Rota pública, sem gate de autenticação, com `head()` próprio: `title`, `description`, `og:title`, `og:description`, `og:type`, `og:url` e `canonical` apontando para `https://visita-sc.lovable.app/politica-privacidade`.
- Layout no design system existente (Card, tokens de `src/styles.css`, zero hex inline), com `Logo`, botão de voltar e `LanguageSwitcher`.
- Conteúdo 100% via i18n (novo bloco `privacy` em `pt.json`, `en.json`, `es.json`), com as seções:
  1. Dados coletados — e-mail, nome de usuário, telefone, congregação/circuito, esboços, anexos.
  2. Finalidade de uso.
  3. Armazenamento local vs. nuvem (anexos e mídia ficam no diretório privado do aparelho; dados de conta e visitas ficam no backend).
  4. Não compartilhamento com terceiros / ausência de publicidade e rastreamento.
  5. Retenção.
  6. Exclusão de conta e dados.
  7. Contato do responsável (e-mail e WhatsApp já usados no diálogo "Sobre").
  8. Data da última atualização.

Links discretos para a rota:
- Rodapé do `src/components/auth/LoginForm.tsx`, no mesmo bloco de "Esqueci a senha".
- Tela `src/routes/_app.configuracoes.tsx`, como linha discreta ao final da página.

## 3. `AndroidManifest.xml` — conformidade Play Store

- `android:allowBackup="false"` e `android:fullBackupContent="false"`.
- `android:usesCleartextTraffic="false"` explícito no `<application>`.
- Remover `READ_EXTERNAL_STORAGE` e `WRITE_EXTERNAL_STORAGE` (backups e anexos já usam o diretório privado via `@capacitor/filesystem` + `@capacitor/share`, que não exigem essas permissões em minSdk 24).
- `INTENT`, App Links e o `FileProvider` permanecem inalterados.

## 4. Documentação — `ANDROID_RELEASE.md`

Reescrita alinhada à realidade do projeto:
- Geração da keystore (`npm run android:keystore`) e aviso crítico de backup.
- Criação do `keystore.properties`.
- Nota de que o Gradle já está configurado (sem passo manual de snippet).
- **Correção importante**: a seção atual recomenda remover o bloco `server` do `capacitor.config.ts`. Isso passará a ser marcado como **não suportado hoje**, porque 20 módulos usam `createServerFn` em caminhos relativos e quebrariam com `webDir` local.
- Geração do AAB (`npm run android:release:aab`) e do APK.
- Versionamento (`versionCode` / `versionName`).
- Checklist da Play Console: ícone 512x512, feature graphic 1024x500, screenshots, Data Safety, URL da política de privacidade, keystore em backup.

## 5. Preservação de arquitetura

Não serão tocados: `capacitor.config.ts`, `public/sw.js`, `public/manifest.webmanifest`, `src/integrations/supabase/*`, `src/start.ts`, `src/server.ts` e qualquer `*.functions.ts`.

`targetSdkVersion` já está em **36** em `android/variables.gradle` — acima do mínimo 35, nada a alterar.

## Validação

`bunx tsc --noEmit` limpo antes de concluir.
