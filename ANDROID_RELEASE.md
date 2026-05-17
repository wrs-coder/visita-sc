# Build de Produção Android (APK / AAB assinado para Play Store)

Este guia cobre **gerar uma keystore**, **configurar a assinatura** e **gerar o APK/AAB** pronto para enviar à Google Play.

> Pré-requisito: você já rodou `npm install`, `npm run cap:install` e `npm run cap:add:android` (veja `CAPACITOR.md`). Isso cria a pasta `android/`.

---

## 1. Gerar a keystore (apenas uma vez na vida do app)

⚠️ **CRÍTICO**: guarde este arquivo + senhas em local seguro (gerenciador de senhas + backup offline). Se perder, **não conseguirá mais atualizar** o app na Play Store — terá que publicar como app novo.

```bash
npm run android:keystore
```

Isso gera `android/app/visita-sc-release.keystore`. O comando vai pedir:

- Senha do keystore (anote!)
- Nome, organização, cidade, etc. (qualquer dado real)
- Senha da chave (pode ser a mesma do keystore)

---

## 2. Criar o `keystore.properties`

Crie o arquivo `android/keystore.properties` (use o exemplo em `android-signing/keystore.properties.example`):

```properties
storeFile=visita-sc-release.keystore
storePassword=SUA_SENHA_DO_KEYSTORE
keyAlias=visita-sc
keyPassword=SUA_SENHA_DA_CHAVE
```

Adicione ao `android/.gitignore`:

```
keystore.properties
app/*.keystore
```

---

## 3. Configurar a assinatura no Gradle

Edite `android/app/build.gradle` aplicando o snippet em `android-signing/build.gradle.snippet`:

1. No topo, carregue o `keystore.properties`.
2. Dentro de `android { ... }`, adicione `signingConfigs { release { ... } }`.
3. Em `buildTypes { release { ... } }`, adicione:
   ```gradle
   signingConfig signingConfigs.release
   minifyEnabled true
   proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
   ```

---

## 4. (Recomendado) Empacotar offline para a Play Store

A Play Store **exige** que o app funcione sem depender de um servidor remoto carregando a UI. Edite `capacitor.config.ts` e **remova o bloco `server`**:

```ts
const config: CapacitorConfig = {
  appId: 'app.lovable.visitasc',
  appName: 'Visita SC',
  webDir: 'dist',
  android: { allowMixedContent: false },
};
```

> Auth com Google/Supabase em modo offline exige configurar deep link `app.lovable.visitasc://` no Supabase (Auth → URL Configuration → Redirect URLs).

---

## 5. Gerar o APK ou o AAB assinado

```bash
# APK (instalação direta / testes)
npm run android:release:apk
# → android/app/build/outputs/apk/release/app-release.apk

# AAB (formato exigido pela Play Store)
npm run android:release:aab
# → android/app/build/outputs/bundle/release/app-release.aab
```

Envie o `.aab` em **Play Console → Produção → Criar nova versão**.

---

## 6. Versionamento (toda nova publicação)

Antes de cada novo build, incremente em `android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        // +1 a cada upload na Play
    versionName "1.0.1"  // visível ao usuário
}
```

---

## Checklist Play Store

- [ ] Ícone do app (`android/app/src/main/res/mipmap-*`) — gere em https://icon.kitchen
- [ ] `versionCode` e `versionName` atualizados
- [ ] `capacitor.config.ts` sem o bloco `server` (modo offline)
- [ ] Política de privacidade publicada (URL pública)
- [ ] Screenshots (mín. 2) + ícone 512x512 + feature graphic 1024x500
- [ ] Keystore + senhas em backup seguro
