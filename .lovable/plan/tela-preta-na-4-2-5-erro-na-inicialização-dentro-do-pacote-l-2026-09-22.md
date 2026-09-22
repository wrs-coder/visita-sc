# Tela preta na 4.2.5: erro na inicialização dentro do pacote local

## Diagnóstico com base no que você enviou

- **4.2.4 abre normalmente** → as mudanças daquela versão (otimização do pacote e ponta a ponta) estão descartadas.
- **Logcat do Android limpo** → nada quebrou no lado nativo: a janela é criada e desenhada.
- **Console do aparelho (chrome://inspect)**: `Uncaught Error: Invariant failed`, lançado logo no arranque, antes de qualquer tela ser montada. É por isso que a tela fica preta e sem mensagem.
- **`/favicon.ico` 404** → a página inicial embutida no pacote ainda aponta para caminhos absolutos do site e nem todos os arquivos públicos entram no pacote.

"Invariant failed" nesse ponto é a falha do roteador ao retomar, dentro do aplicativo, uma página que foi gerada no servidor. A casca embutida carrega marcas de renderização do site; no celular, servida de um endereço local, essa retomada não bate e o arranque aborta. A versão 4.2.5 mudou o conjunto de arquivos empacotados, o que fez essa fragilidade — que já existia — passar a falhar sempre.

Esta leitura será confirmada no passo 1 antes de qualquer correção definitiva.

## Plano

### 1. Reproduzir aqui com o pacote real
Montar o pacote local e abri-lo servido como o celular faz, com o erro legível (sem minificação), confirmando a linha exata. Sem essa confirmação nada é dado como certo.

### 2. Casca do aplicativo passa a ser 100% local
A página inicial embutida no APK deixará de carregar marcas de renderização do servidor e passará a iniciar o app do zero no aparelho — que é como o aplicativo instalado deve funcionar. Assim o arranque não depende de nada gerado no site.

### 3. Corrigir os caminhos e arquivos faltantes
- Converter para caminhos relativos tudo que hoje aponta para a raiz do site (ícones, favicon, imagens), eliminando os 404.
- Copiar os arquivos públicos necessários para dentro do pacote.

### 4. Nunca mais tela preta muda
- Proteção contra falha de carregamento no aplicativo inteiro, não só nas telas internas.
- Aviso legível com botão "Tentar novamente" quando o arranque falhar.
- Fundo sólido na janela, para que qualquer atraso mostre a cor do app em vez de preto.

### 5. Adiar o que roda cedo demais
O código novo de anexos abre o armazenamento local de arquivos já no carregamento; passará a abrir apenas quando um anexo for realmente usado.

### 6. Conferência do pacote ampliada
Além dos arquivos citados na página inicial, validar também os pedaços carregados sob demanda (anexos, arquivos, compartilhamento) e os arquivos públicos.

## Versão e validação

- Subir para **4.2.6** (código de versão 16) no app, na tela de login e na configuração do Android.
- Verificação de tipos, suíte de testes, montagem do pacote e abertura do pacote em navegador simulando o aparelho: precisa abrir na tela de login, sem erro no console.
- Os anexos entregues na 4.2.5 continuam funcionando; nada será revertido.

## Fora do escopo

Banco de dados, regras de acesso, Bíblia offline, login offline com PIN/biometria, e o site publicado (que continua com renderização no servidor, inalterado).

## Detalhes técnicos

- `scripts/build-app-shell.mjs`: gerar a casca nativa sem payload de SSR (sem `<!--$-->`/estado serializado do Start), preservando `<base href="./">`, `modulepreload` e o `<script type="module">` de entrada; reescrever todo `src`/`href` iniciado por `/` para `./`; copiar `public/` para `dist-app`; estender `verifyPackagedAssets` aos `import("./assets/…")` dinâmicos.
- Confirmar no passo 1 se o erro vem de `hydrateRoot`/`StartClient`; se sim, a casca client-only resolve na raiz.
- `src/lib/outline-attachments.ts`: `createStore()` sai do escopo do módulo para getter preguiçoso com cache.
- `src/routes/__root.tsx`: `ChunkErrorBoundary` em volta do conteúdo raiz e handlers globais de `error`/`unhandledrejection` no boot.
- `android/app/src/main/res/values/styles.xml`: `android:windowBackground` sólido em `AppTheme.NoActionBar`, mantendo barras transparentes e `shortEdges`.
- `package.json`, `src/components/auth/LoginForm.tsx`, `android/app/build.gradle`: `4.2.6` / `versionCode 16`.
