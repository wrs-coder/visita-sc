# Gerando o APK Android com Capacitor

Este projeto já está pré-configurado para empacotamento Android via Capacitor.

## Pré-requisitos (no seu computador)

- Node.js 20+
- Android Studio (com Android SDK + JDK 17)

## Passos (apenas 1ª vez após clonar)

```bash
# 1. Instala as dependências do projeto
npm install

# 2. Instala o Capacitor (core, cli e plataforma android)
npm run cap:install

# 3. Adiciona a plataforma Android (cria a pasta android/)
npm run cap:add:android
```

> O arquivo `capacitor.config.ts` já está pronto com:
> - `appId`: `app.lovable.visitasc`
> - `appName`: `Visita SC`
> - `server.url`: aponta para `https://visita-sc.lovable.app` (carrega o app publicado, então atualizações no Lovable refletem no APK sem rebuild).

## Gerar / atualizar o APK

```bash
# Faz o build web + sync para o Android
npm run android:build

# Abre o projeto Android Studio para gerar o APK assinado
npm run cap:open:android
```

No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Empacotar o conteúdo localmente (sem depender do site)

Se preferir que o APK funcione 100% offline com o build estático:

1. Edite `capacitor.config.ts` e **remova** o bloco `server: { ... }`.
2. Rode `npm run android:build` novamente.

> Observação: nesse modo, o login com Google/Supabase precisa de configuração extra de deep link (`app.lovable.visitasc://`).

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run cap:install` | Instala `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` |
| `npm run cap:add:android` | Adiciona a plataforma Android |
| `npm run cap:sync` | Sincroniza web build → projeto nativo |
| `npm run android:build` | `build` + `cap sync android` |
| `npm run android:run` | Build + sync + abre Android Studio |
| `npm run cap:open:android` | Abre o projeto Android no Android Studio |
