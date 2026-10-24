# Revisão da criação de contas e dos logins

## O que encontrei
1. **Código do superintendente fica escrito no próprio código do app.** Se a configuração secreta faltar, o app aceita o 152832 que está escrito no código. Funciona, mas qualquer pessoa com acesso ao código vê o número. Isso foi um improviso para fazer o cadastro voltar a funcionar.
2. **Tela "Criar conta" ainda recarrega a página inteira** ao passar para o cadastro. A rodada anterior disse que isso tinha sido corrigido, mas não foi. Essa é a piscada clara/escura que ainda aparece.
3. **Código de congregação errado só dá erro no final.** Se o ancião digitar um código que não existe, a tela mostra todos os cargos como livres. Ele preenche tudo e só recebe o erro ao tocar em "Criar conta". Também pode escolher um cargo que já está ocupado.
4. Login com usuário/senha, login com código da esposa, PIN e biometria não foram alterados nas últimas rodadas. A verificação de erros do app está limpa.

## Correções
1. Esconder o código do superintendente: o número sai do código do app e fica guardado num cofre seguro do servidor. O código **não muda**: continua sendo 152832, e nenhum usuário atual é afetado.
2. Trocar o recarregamento por navegação interna na tela "Criar conta".
3. No cadastro de ancião, quando o servidor disser que o código não existe, mostrar logo "Código inválido" e não exibir cargos. Os cargos livres só caem para a lista completa se faltar conexão. O servidor continua conferindo tudo na gravação final.

## Validação
- Testar no navegador: login com senha errada (o aviso "Esqueci minha senha" deve aparecer), 152832 indo para o cadastro de superintendente, um código de congregação real indo para o cadastro de ancião com os cargos certos, um código inexistente mostrando o erro e a caixa de termos travando o botão.
- Rodar a verificação de erros e os testes.
- Sem criar contas de verdade no banco.

## Detalhes técnicos
- Secret `SUPER_REGISTRATION_CODE` (pedido ao usuário via add_secret). `getSuperCode` sem fallback; `checkSignupCode` retorna `none` se vazio.
- `cadastro.index.tsx`: `nav({ to, search: { code } })` em vez de `window.location.assign`.
- `cadastro.anciao.tsx`: `res.ok === false` → `setCodeError`, `setAvailable([])`; fallback completo só no `catch`.
