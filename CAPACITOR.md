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
> - `appId`: `com.waorodrigues.visitasc`
> - `appName`: `Visita SC`
> - `webDir`: `dist-app` (a interface fica dentro do APK/AAB)
> - sem `server.url`: as chamadas de dados usam `visitasc.com.br` primeiro e os outros domínios apenas como alternativas.

## Gerar / atualizar o APK

```bash
# Faz o build web + sync para o Android
npm run android:build

# Abre o projeto Android Studio para gerar o APK assinado
npm run cap:open:android
```

No Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

## Conteúdo local e conexão

O APK já é empacotado com a interface local. Não adicione `server.url` e não
copie arquivos manualmente para `dist-app`: os scripts abaixo geram e validam a
casca automaticamente. A troca do endereço de dados não recarrega a interface
nem apaga a sessão do usuário.

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run cap:install` | Instala `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` |
| `npm run cap:add:android` | Adiciona a plataforma Android |
| `npm run cap:sync` | Sincroniza web build → projeto nativo |
| `npm run android:build` | `build` + `cap sync android` |
| `npm run android:run` | Build + sync + abre Android Studio |
| `npm run cap:open:android` | Abre o projeto Android no Android Studio |
