# Resumo do dia em cartões separados + tela de entrada mais elegante

## 1. "Resumo do dia": um cartão para cada assunto
Hoje o cartão "Estudos e Campo do dia" junta duas coisas diferentes. Ele vira dois cartões:
- **Estudos do dia**: estudos e revisitas de hoje, com título em cada informação (dirigente, horário, local, telefone, observações).
- **Reunião de campo do dia**: horário, dirigente, local de encontro, território e observações.

Cada cartão some quando não houver nada para hoje. A mudança vale para os três lugares onde esse cartão aparece: o painel da esposa e o "Resumo da Semana" (comissão de anciãos e superintendente).

## 2. Tela de entrada mais elegante
Na tela inicial, abaixo do cartão de login, entra uma área com a pergunta simples **"Você tem um código de acesso?"** e dois botões bem grandes (fáceis de tocar), cada um com ícone grande, nome em letra maior e uma frase curta:
- **Sou do corpo de anciãos** — "Recebi o código da congregação".
- **Sou esposa do superintendente** — "Recebi o código do meu esposo".

Ao tocar, abre uma tela só com o necessário:
- Título grande do acesso escolhido e passo explicado em linguagem simples: "Digite o código que você recebeu".
- Um único campo grande, que já aceita letras minúsculas, espaços e traços (corrige sozinho), com exemplo de como o código parece.
- Um botão grande "Entrar".
- Ajuda "Não tem o código?" explicando, em uma frase, a quem pedir (anciãos: ao coordenador/superintendente; esposa: ao esposo, que cria em "Meu perfil").
- Botão "Voltar" grande no topo e um aviso amigável se o código estiver errado ("Código não encontrado. Confira as letras e tente de novo.").

Depois de entrar uma vez, o aparelho lembra o acesso (como já acontece hoje). O código continua o mesmo.

No link "Novo superintendente? Criar conta", aparece um pequeno "Como obter o código?" que abre uma janela simples explicando que o código é enviado pelo desenvolvedor, com botão "Pedir por e-mail" (abre o e-mail para wrscircuito@gmail.com com assunto já preenchido). A mesma dica aparece na tela de cadastro do superintendente, junto ao campo do código.

Nada muda no login, no PIN, na biometria nem nos dados.

## Detalhes técnicos
- Cartões: dividir o bloco `guest.today.studiesField` em `visitante.painel.tsx` e nas duas ocorrências de `VisitSummaryView.tsx`, usando `InfoList`. Novas chaves i18n `guest.today.studies` / `guest.today.field` em pt/en/es.
- `LoginForm.tsx`: trocar o link único "Acesso visitante" por dois cartões-link para `/visitante?tipo=anciaos` e `/visitante?tipo=esposa`; diálogo "Como obter o código" com `mailto:`.
- `visitante.index.tsx`: `validateSearch` para `tipo`, textos/ícone conforme o tipo; envio do código intacto.
- `cadastro.superintendente.tsx`: dica com `mailto:` abaixo do campo código.
- Só tokens de cor existentes; textos novos em pt/en/es.
