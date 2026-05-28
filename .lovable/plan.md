## Atualização de Versão para 3.0.0

### Objetivo
Atualizar a versão do aplicativo de 2.5.2 para 3.0.0 em todas as bases necessárias.

### Arquivos a alterar
1. **package.json**
   - `version`: `"2.5.2"` → `"3.0.0"`

2. **android/app/build.gradle**
   - `versionCode`: `5` → `6`
   - `versionName`: `"2.5.2"` → `"3.0.0"`

3. **src/components/auth/LoginForm.tsx**
   - `APP_VERSION`: `"2.4.0"` → `"3.0.0"`
   - `APP_BUILD`: `"2026.05.24"` → `"2026.05.28"`
   - `APP_UPDATED_AT`: `"24/05/2026"` → `"28/05/2026"`

### Notas
- A aba "Sobre" exibe a versão via o Dialog no LoginForm (chave `about.versionLine`). Não há rota separada de "Sobre"; a informação já aparece no popup de informações.
- O `versionCode` do Android deve subir de 5 para 6 porque o Google Play exige incremento numérico obrigatório a cada release, independentemente do `versionName`.
- Após aprovação, o harness executará build e testes automaticamente para validar.