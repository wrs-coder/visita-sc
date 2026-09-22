# Aplicativo pisca e fica em tela preta na 4.2.5

## O que a sua informação já descarta

Como a **4.2.4 abre normalmente**, ficam descartadas as mudanças daquela versão: a otimização automática do pacote (R8) e as barras de ponta a ponta. Ou seja, o problema nasceu nas mudanças de **anexos da 4.2.5**, que são só de código do app — nada de banco de dados, Bíblia offline ou login por PIN.

## Causas prováveis dentro da 4.2.5 (a confirmar, não chutar)

1. **Abertura do armazenamento local logo no início.** O novo arquivo de anexos abre o banco local de arquivos assim que o app carrega, antes de qualquer tela. Se essa abertura falhar ou travar dentro do aplicativo instalado, nada é desenhado — tela preta.
2. **Novos pedaços de programa carregados sob demanda.** Os anexos passaram a carregar partes extras (arquivos, compartilhamento). Se algum desses pedaços não estiver no pacote gerado, a abertura quebra silenciosamente.
3. **Falha sem aviso.** Hoje a proteção contra erro de carregamento só existe nas telas internas; se o erro acontece antes da primeira tela, o usuário vê preto e nenhuma mensagem.

## Plano

### 1. Reproduzir de verdade antes de corrigir
Gerar o pacote local (o mesmo que vai para o celular) e abrir essa pasta servida como o aplicativo faz, capturando os erros do console. Isso mostra a linha exata da falha em vez de suposição.

### 2. Adiar a abertura do armazenamento local
Passar a abrir o banco local de arquivos apenas no momento em que um anexo for realmente lido ou salvo, nunca durante o carregamento do app. Assim a primeira tela nunca depende disso.

### 3. Nunca mais tela preta silenciosa
- Envolver o app inteiro (e não só as telas internas) na proteção contra falha de carregamento, com a mensagem e o botão "Tentar novamente".
- Mostrar um aviso legível caso ocorra um erro antes da primeira tela, com opção de recarregar.
- Dar um fundo sólido à janela do app, para que qualquer atraso apareça na cor do app em vez de preto.

### 4. Conferir o pacote
Confirmar que todos os pedaços novos (arquivos, compartilhamento, anexos) estão presentes dentro do pacote gerado; a conferência atual valida só os pedaços citados na página inicial e será ampliada para os carregados sob demanda.

### 5. Se ainda persistir no aparelho
Capturar o log do celular (Logcat, filtrando "Capacitor" e "chromium"). Com o erro em mãos a correção é direta, sem tentativa e erro.

## Versão e validação

- Subir para **4.2.6** (código de versão 16) no pacote do app, na tela de login e na configuração do Android.
- Rodar verificação de tipos, a suíte de testes e a montagem do pacote antes de fechar.
- Os anexos corrigidos na 4.2.5 continuam funcionando: nada será revertido, apenas adiado o que roda cedo demais.

## Fora do escopo

Banco de dados, regras de acesso, Bíblia offline, login offline com PIN/biometria e a otimização/ponta a ponta da 4.2.4 (que comprovadamente abre).

## Detalhes técnicos

- `src/lib/outline-attachments.ts`: trocar o `createStore()` avaliado no escopo do módulo por um getter preguiçoso com cache; manter os `await import("@capacitor/filesystem")` guardados por `isCapacitorNative()`.
- `src/routes/__root.tsx`: envolver o conteúdo raiz com `ChunkErrorBoundary` (hoje só em `_app.tsx`) e registrar um handler global de `error`/`unhandledrejection` na fase de boot.
- `android/app/src/main/res/values/styles.xml`: `android:windowBackground` sólido em `AppTheme.NoActionBar`, preservando barras transparentes e `shortEdges`.
- `scripts/build-app-shell.mjs`: estender `verifyPackagedAssets` para percorrer também os `import("./assets/…")` dinâmicos dos chunks.
- Reprodução: `npm run app:package` + servidor estático em `dist-app` + Playwright, coletando console e erros de rede.
- `package.json`, `src/components/auth/LoginForm.tsx`, `android/app/build.gradle`: versão `4.2.6` / `versionCode 16`.
