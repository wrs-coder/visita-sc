# Ações recomendadas pelo Play Console (Android 15 e R8)

## Situação confirmada
- O app já é exibido de ponta a ponta (barras transparentes e margens seguras nas telas, feitas na 4.2.4), mas a tela principal do Android ainda não chama `EdgeToEdge.enable()`, que é a forma recomendada pelo Google.
- O aviso sobre `setStatusBarColor`/`setNavigationBarColor` não vem do nosso código: vem do calendário da biblioteca Material do Google (`MaterialDatePicker`), que entra no app junto de um plugin (provavelmente o de biometria). O app não usa esse calendário.
- R8 e a redução de recursos já estão ligados, mas a "redução otimizada de recursos" não está ativada. O plug-in Android do Gradle está na 8.13.

## O que será feito
1. **Ponta a ponta:** chamar `EdgeToEdge.enable(this)` na tela principal, mantendo as margens seguras já existentes. Assim o comportamento fica igual em Android antigos e novos.
2. **APIs descontinuadas:** forçar a versão mais recente e estável da biblioteca Material, que deixa de usar essas chamadas no calendário. Se a versão nova ainda as tiver, o aviso continua, mas é só uma recomendação: não bloqueia a publicação e não afeta o funcionamento, porque o calendário nunca é aberto.
3. **R8:** ativar a redução otimizada de recursos (`android.r8.optimizedResourceShrinking=true`), suportada pela versão atual.
4. **Gradle 9.0: não atualizar agora.** É uma mudança grande e os plugins do Capacitor 8 (biometria, armazenamento seguro, arquivos, compartilhar) ainda podem não ser compatíveis. Isso poderia impedir o APK/AAB de compilar. Fica para quando o Capacitor suportar oficialmente. Também é só uma recomendação.
5. Subir a versão para 4.2.9 / versionCode 19.

## Riscos e validação
- Não mexe em banco, login/PIN/biometria, Bíblia, esboços nem nas telas web.
- Aqui não tenho o SDK Android nem a chave, então o APK/AAB não pode ser gerado nem testado neste ambiente. Depois, você gera no Windows com `npm run android:release:aab` e confere no celular: cabeçalho sem ficar embaixo da barra de status, botões inferiores visíveis, teclado, Tela Cheia e login por biometria.
- Se a compilação falhar por causa da biblioteca Material, desfaço só esse item.

## Detalhes técnicos
- `MainActivity.java`: `androidx.activity.EdgeToEdge.enable(this)` antes de `super.onCreate`.
- `android/app/build.gradle`: `implementation "com.google.android.material:material:<estável mais recente>"` para fixar a versão transitiva.
- `android/gradle.properties`: `android.r8.optimizedResourceShrinking=true`.
- Versão: `package.json`, `LoginForm.tsx` (`APP_VERSION`), `android/app/build.gradle`.
