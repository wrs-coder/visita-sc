# Atualizar a versão do aplicativo para 4.2.0 em todos os pontos

## Estado atual (verificado)

- `android/app/build.gradle`: já está em `versionName "4.2.0"` / `versionCode 10`.
- `src/components/auth/LoginForm.tsx`: já exibe `APP_VERSION = "4.2.0"` na tela de login.
- `package.json`: ainda em `"version": "4.1.6"` — único ponto desalinhado.

## Mudanças

1. **package.json** — alterar `"version"` de `4.1.6` para `4.2.0` (mantém alinhamento com o `versionName` do Android, como exige o guia de release).
2. **Verificação** — rodar `bunx tsgo --noEmit` para confirmar que nada quebrou (mudança de metadado, sem impacto funcional).

## Observações

- Nenhuma outra tela exibe número de versão; não há mais nada a alterar no frontend.
- O número de build do Android (`versionCode 10`) já está correto para o próximo pacote.
- Não é necessário gerar novo APK/AAB por causa desta mudança — ela apenas alinha o metadado do projeto.
