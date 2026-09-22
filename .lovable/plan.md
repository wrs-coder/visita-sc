# Aplicativo pisca e fica em tela preta na 4.2.5

## O que já sabemos com certeza

- A **4.2.4 abre normalmente** (só tinha a falha das imagens). Logo, a otimização do pacote e a exibição de ponta a ponta introduzidas lá **não são a causa**.
- O **log do aparelho não mostra nenhum erro do lado Android**: a janela é criada, a tela do app é montada e desenhada normalmente, sem travamento, sem erro de plugin, sem falha de permissão. Aparecem só mensagens normais do sistema.

Conclusão: o aplicativo abre, mas o **conteúdo interno não desenha nada** — a tela fica na cor de fundo. A diferença entre as duas versões é exclusivamente o novo código de anexos da 4.2.5.

## O que falta para cravar a causa

O log enviado não inclui as mensagens do conteúdo (console do WebView). Essas linhas aparecem com os filtros `chromium`, `Console` ou `Capacitor` no Logcat — são elas que trazem o erro real. Enquanto isso, a mesma falha será reproduzida aqui, abrindo o pacote local exatamente como o celular abre.

## Plano

### 1. Reproduzir aqui, com o pacote real
Montar o pacote local (o mesmo que vai para o celular) e abri-lo servido como o app faz, coletando erros de console e de carregamento. Isso deve mostrar a linha exata da falha, sem depender de tentativa e erro no aparelho.

### 2. Tirar do caminho o que roda cedo demais
O novo código de anexos abre o armazenamento local de arquivos assim que o app carrega, antes de qualquer tela. Isso passará a acontecer só quando um anexo for realmente aberto ou salvo, para que a primeira tela nunca dependa disso.

### 3. Nunca mais tela preta muda
- Aplicar a proteção contra falha de carregamento ao aplicativo inteiro, não apenas às telas internas.
- Exibir um aviso legível, com botão "Tentar novamente", se algo falhar antes da primeira tela.
- Dar fundo sólido à janela, para que qualquer atraso apareça na cor do app em vez de preto.

### 4. Conferir o pacote por inteiro
A conferência atual valida os arquivos citados na página inicial. Será ampliada para os pedaços carregados sob demanda (anexos, arquivos, compartilhamento), que são justamente os novos da 4.2.5.

### 5. Se o passo 1 não revelar o erro
Peço o Logcat filtrado por `chromium`/`Console` durante a abertura; com essa linha a correção é imediata.

## Versão e validação

- Subir para **4.2.6** (código de versão 16) no app, na tela de login e na configuração do Android.
- Verificação de tipos, suíte de testes e montagem do pacote antes de fechar.
- Os anexos corrigidos na 4.2.5 permanecem: nada será revertido.

## Fora do escopo

Banco de dados, regras de acesso, Bíblia offline, login offline com PIN/biometria e as mudanças da 4.2.4, que comprovadamente abrem.

## Detalhes técnicos

- `src/lib/outline-attachments.ts`: `createStore()` sai do escopo do módulo para um getter preguiçoso com cache; `await import("@capacitor/filesystem")` continua guardado por `isCapacitorNative()`.
- `src/routes/__root.tsx`: envolver o conteúdo raiz com `ChunkErrorBoundary` (hoje só em `_app.tsx`) e registrar handlers globais de `error`/`unhandledrejection` no boot.
- `android/app/src/main/res/values/styles.xml`: `android:windowBackground` sólido em `AppTheme.NoActionBar`, mantendo barras transparentes e `shortEdges`.
- `scripts/build-app-shell.mjs`: `verifyPackagedAssets` percorre também os `import("./assets/…")` dinâmicos dos chunks.
- Reprodução: `npm run app:package` + servidor estático sobre `dist-app` + Playwright, coletando console, erros de rede e captura de tela.
- `package.json`, `src/components/auth/LoginForm.tsx`, `android/app/build.gradle`: `4.2.6` / `versionCode 16`.
