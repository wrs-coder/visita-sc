# Aplicativo abre, pisca e fica em tela preta

## O que mudou entre a versão que abria e a atual

A última versão que abria no aparelho foi a 4.2.3. Depois dela entraram duas mudanças que afetam justamente a abertura:

1. **4.2.4** — otimização automática do pacote (R8) ligada pela primeira vez, mais barras do sistema transparentes e fundo do tema sem cor definida.
2. **4.2.5** — anexos gravados de verdade no aparelho.

Tela preta (e não branca) logo após o splash é o sintoma típico de: a tela do app ficou transparente/sem fundo, ou o pacote otimizado removeu algo necessário à ponte nativa, travando o carregamento antes de desenhar qualquer coisa. Ainda não dá para afirmar qual das duas é a causa sem uma prova, então o plano começa isolando a causa em vez de chutar.

## Passo 1 — Isolar a causa (rápido, um pacote de teste)

Gerar um pacote de teste com a otimização automática desligada, mantendo todo o resto igual.

- Abre normalmente: a causa é a otimização (R8) → seguir o Passo 2.
- Continua preta: a causa é visual/tema ou de inicialização → seguir o Passo 3.

## Passo 2 — Deixar a otimização segura

- Manter a otimização de código, mas desligar a remoção automática de recursos, que é a parte que mais costuma apagar itens ainda usados.
- Ampliar a lista de proteção para as bibliotecas usadas pelo app (ponte nativa, biometria, armazenamento seguro, arquivos, compartilhamento, navegador) e para tudo que é acessado por nome em tempo de execução.
- Gerar novo pacote e confirmar a abertura.

## Passo 3 — Garantir que a tela nunca fique preta

- Definir um fundo sólido para a janela do app (hoje está "sem fundo"), para que, em qualquer atraso de carregamento, apareça a cor do app e não preto.
- Manter as barras transparentes e os recuos de ponta a ponta já entregues na 4.2.4, sem retroceder.
- Fazer a proteção contra falhas de carregamento valer para o app inteiro, e não apenas para as telas internas: se algo falhar antes da primeira tela, mostrar aviso com botão "Tentar novamente" em vez de tela vazia.

## Passo 4 — Ver o erro real, se persistir

Se ainda assim não abrir, capturar o log do aparelho (Logcat, filtrando por "Capacitor" e "chromium"). Com a linha do erro em mãos, a correção é direta.

## Versão e validação

- Subir para 4.2.6 (código de versão 16) em todos os pontos: pacote do app, tela de login e configuração do Android.
- Rodar verificação de tipos, a suíte de testes e a montagem do pacote local, conferindo que todos os arquivos citados na página inicial existem dentro do pacote.

## Fora do escopo (não será tocado)

Banco de dados, regras de acesso, Bíblia offline, login offline com PIN/biometria e o fluxo de anexos recém-corrigido.

## Detalhes técnicos

- `android/app/build.gradle`: `shrinkResources false`; teste de isolamento com `minifyEnabled false`; `versionCode 16` / `versionName "4.2.6"`.
- `android/app/proguard-rules.pro`: keeps adicionais para `com.getcapacitor.**`, plugins `com.capacitorjs.plugins.**`, `com.aparajita.**`, `androidx.webkit.**`, classes anotadas e membros usados por reflexão; `-keepnames` para as activities.
- `android/app/src/main/res/values/styles.xml`: `android:windowBackground` com cor sólida do app em `AppTheme.NoActionBar` (substituindo `android:background @null`), preservando `statusBarColor`/`navigationBarColor` transparentes e `shortEdges`.
- `src/routes/__root.tsx`: envolver o conteúdo raiz com `ChunkErrorBoundary` (hoje só está em `_app.tsx`).
- `package.json` e `src/components/auth/LoginForm.tsx`: versão `4.2.5` → `4.2.6`.
