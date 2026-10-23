# Tela de entrada mais curta (sem mexer no login)

Mantém como está: campos de Usuário/Senha, campo do código de acesso e o botão Entrar. Nada muda no login, PIN, biometria ou dados.

## 1. Um único "Criar conta"
As duas linhas ("Sou ancião novo..." e "Sou superintendente novo...") viram um só link: **Criar conta**.

## 2. Nova tela "Criar conta" pede o código
- Campo "Código" + botão "Continuar" + link "Como obter o código?" logo abaixo.
- Código de congregação válido → abre o cadastro de ancião com o código já preenchido.
- Código do superintendente → abre o cadastro de superintendente com o código já preenchido.
- Código errado → "Código não encontrado. Confira e tente de novo."
- O código do superintendente continua conferido só no servidor (não fica escrito dentro do app), para ninguém descobri-lo.
- As telas de cadastro atuais continuam iguais e funcionando pelos links antigos.

## 3. "Esqueci minha senha" só quando erra
- Sai do rodapé. Quando a senha estiver errada, aparece uma janelinha: "Senha incorreta" com botões "Tentar de novo" e "Esqueci minha senha".

## 4. Rodapé em uma linha
- "Política de Privacidade · Apoie o desenvolvedor · Sobre" numa linha só, pequena, dentro do cartão, na borda inferior.

Resultado: a tela cabe sem rolagem na maioria dos celulares.

## Detalhes técnicos
- Nova rota `src/routes/cadastro.index.tsx` (`/cadastro`). Nova server fn `checkSignupCode` em `auth.functions.ts`: compara com `getSuperCode()` → `{kind:"super"}`; senão reusa a checagem de convite de ancião existente → `{kind:"elder"}`; senão `{kind:"none"}`. Nunca devolve o código.
- `cadastro.anciao.tsx` e `cadastro.superintendente.tsx`: `validateSearch` opcional `code` para pré-preencher.
- `LoginForm.tsx`: estado `wrongPwdOpen` aberto no ramo `invalidCredentials` (Dialog com link `/esqueci-senha`); rodapé reorganizado; `SupportDeveloperDialog` e "Sobre" passam para dentro do cartão.
- Textos novos em pt/en/es; só tokens de cor existentes.
