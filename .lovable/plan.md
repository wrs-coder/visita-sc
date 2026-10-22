# Resumo do dia em cartões separados + tela de entrada mais elegante

## 1. "Resumo do dia": um cartão para cada assunto
Hoje o cartão "Estudos e Campo do dia" junta duas coisas diferentes. Ele vira dois cartões:
- **Estudos do dia**: estudos e revisitas de hoje, com título em cada informação (dirigente, horário, local, telefone, observações).
- **Reunião de campo do dia**: horário, dirigente, local de encontro, território e observações.

Cada cartão some quando não houver nada para hoje. A mudança vale para os três lugares onde esse cartão aparece: o painel da esposa e o "Resumo da Semana" (comissão de anciãos e superintendente).

## 2. Tela de entrada mais elegante
Na tela inicial, abaixo do cartão de login do superintendente/ancião, entra uma área "Outros acessos" com dois botões grandes e bem separados:
- **Corpo de anciãos**: ícone de prédio, frase curta "Use o código da congregação".
- **Esposa do superintendente**: ícone de coração, frase curta "Use o código criado no perfil do superintendente".

Os dois levam à tela do código, que passa a mostrar título, ícone e explicação de acordo com o acesso escolhido (um seletor no topo deixa trocar sem voltar). O código digitado continua o mesmo de hoje.

No link "Novo superintendente? Criar conta", aparece um pequeno "Como obter o código?" que abre uma janela simples explicando que o código é enviado pelo desenvolvedor, com botão "Pedir por e-mail" (abre o e-mail para wrscircuito@gmail.com com assunto já preenchido). A mesma dica aparece na tela de cadastro do superintendente, junto ao campo do código.

Nada muda no login, no PIN, na biometria nem nos dados.

## Detalhes técnicos
- Cartões: dividir o bloco `guest.today.studiesField` em `visitante.painel.tsx` e nas duas ocorrências de `VisitSummaryView.tsx`, usando `InfoList`. Novas chaves i18n `guest.today.studies` / `guest.today.field` em pt/en/es.
- `LoginForm.tsx`: trocar o link único "Acesso visitante" por dois cartões-link para `/visitante?tipo=anciaos` e `/visitante?tipo=esposa`; diálogo "Como obter o código" com `mailto:`.
- `visitante.index.tsx`: `validateSearch` para `tipo`, textos/ícone conforme o tipo; envio do código intacto.
- `cadastro.superintendente.tsx`: dica com `mailto:` abaixo do campo código.
- Só tokens de cor existentes; textos novos em pt/en/es.
