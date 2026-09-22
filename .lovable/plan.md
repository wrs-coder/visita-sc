# Play Console: otimização (R8) e exibição de ponta a ponta

## O que os dois avisos significam

**1. Otimização (R8) — impacto baixo, ganho real.**
Hoje o pacote Android é gerado sem otimização (a opção está desligada). Isso não quebra nada,
mas deixa o app maior e um pouco mais lento para abrir. Ligar a otimização reduz o tamanho do
download e o uso de memória. Risco: quando mal configurada, ela pode remover partes usadas pelos
recursos nativos (biometria, armazenamento seguro, compartilhamento, arquivos). Por isso a ativação
vem acompanhada de regras de proteção e de um teste de instalação antes de publicar.

**2. Exibição de ponta a ponta — impacto visual real, precisa de ajuste.**
O app é compilado para Android 15+, onde o conteúdo passa a ocupar a tela inteira, por baixo da
barra de status (topo) e da barra de navegação (base). Sem tratamento, títulos podem ficar escondidos
atrás do relógio e botões inferiores atrás da barra de gestos. Na casca do app a marcação de tela
cheia já existe, mas a página web (usada no navegador e no preview) ainda não a declara, e as áreas
seguras só estão definidas em duas classes de estilo pouco usadas. Ou seja: hoje o comportamento é
inconsistente entre navegador e aplicativo instalado.

## O que será feito

1. Ativar a otimização R8 no pacote de release, com regras de proteção para Capacitor, plugins
   (biometria, armazenamento seguro, navegador, arquivos, compartilhamento) e classes chamadas pela
   ponte JavaScript.
2. Declarar a tela inteira também na página web (mesma marcação já usada na casca do app).
3. Aplicar as margens de segurança de topo e base nas áreas fixas: cabeçalho do aplicativo, barra
   inferior/status offline, cronômetro fixo e as telas cheias (esboço e nota em tela cheia), usando
   as variáveis de área segura já existentes.
4. Garantir barras de sistema transparentes no tema Android, para o conteúdo aparecer por baixo
   sem faixas cinzas.
5. Subir a versão para 4.2.4 (versionCode 14) e revalidar: verificação de tipos, testes, build e
   uma passagem visual no preview em tela de celular.

## Detalhes técnicos

- `android/app/build.gradle`: `minifyEnabled true` e `shrinkResources true` no bloco `release`.
- `android/app/proguard-rules.pro`: `-keep public class * extends com.getcapacitor.Plugin`,
  `-keepclassmembers class * { @com.getcapacitor.PluginMethod <methods>; }`,
  `-keep @com.getcapacitor.annotation.CapacitorPlugin class *`, `-keepattributes *Annotation*,
  JavascriptInterface`, além de `-dontwarn` para `androidx.biometric` e plugins Cordova.
- `src/routes/__root.tsx`: viewport passa a `width=device-width, initial-scale=1, viewport-fit=cover`
  (igual ao gerado por `scripts/build-app-shell.mjs`).
- `src/styles.css`: manter `.pt-safe`/`.pb-safe` e adicionar utilitários para cabeçalho fixo e
  containers de diálogo em tela cheia; aplicar nos componentes `_app.tsx` (cabeçalho),
  `OfflineStatusBar`, `OutlineTimer` (variante fullscreen) e `FieldNoteFullscreenDialog`.
- `android/app/src/main/res/values/styles.xml`: em `AppTheme.NoActionBar`, adicionar
  `android:statusBarColor` e `android:navigationBarColor` transparentes e
  `android:enforceNavigationBarContrast`/`enforceStatusBarContrast` como `false` (valores válidos em
  API 29+; sem efeito colateral abaixo disso). Não é necessário chamar `enableEdgeToEdge()` em Java,
  pois o Capacitor `BridgeActivity` já aplica o comportamento no Android 15 com o tema ajustado.
- Sem mudanças em banco de dados, login offline, esboços ou Bíblia.

## Verificação

- `tsgo` sem erros, suíte de testes completa, build OK.
- Playwright em viewport de celular confirmando que cabeçalho e barra inferior não ficam sob as
  bordas com `viewport-fit=cover`.
- Após gerar o AAB 4.2.4, instalar e abrir uma vez com a otimização ligada para confirmar que
  biometria, PIN, anexos e compartilhamento continuam funcionando.
