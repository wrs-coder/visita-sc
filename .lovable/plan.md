# Troca de senha: mensagem clara quando a senha é fraca

## O que aconteceu (registros de hoje, 19:42–19:47)
- Foram duas tentativas de trocar a senha, e as duas foram recusadas com a resposta "senha conhecida como fraca e fácil de adivinhar". O sistema bloqueia senhas que já apareceram em vazamentos públicos.
- Por isso a senha **não mudou**. Depois disso, as entradas com a senha nova deram "senha inválida". A senha antiga continua valendo.
- O app mostra o erro em inglês, em letra miúda, e é fácil não perceber.

## O que vou mudar
1. Traduzir esse erro: "Essa senha é muito comum ou já apareceu em vazamentos. Escolha outra (ex.: uma frase com números)."
2. Mostrar uma dica abaixo do campo de senha: no mínimo 8 caracteres, misturando letras, números e símbolos.
3. Aplicar isso nas 3 telas de senha: Perfil, Redefinir senha e Esqueci a senha.
4. Na tela de entrada, traduzir também "senha inválida" para "E-mail ou senha incorretos".

## Detalhes técnicos
- Nova função `friendlyAuthError(err, t)` que reconhece `weak_password` e `invalid_credentials` e devolve o texto traduzido. Ela é usada em `_app.perfil.tsx`, `redefinir-senha.tsx`, `esqueci-senha.tsx` e na tela de login.
- Novas chaves de tradução em pt, en e es, e um teste da função.
- A proteção contra senhas vazadas **continua ligada**.
