# Resumo do dia em cartões separados + tela de entrada mais elegante

## 1. "Resumo do dia": um cartão para cada assunto
Hoje o cartão "Estudos e Campo do dia" junta duas coisas diferentes. Ele vira dois cartões:
- **Estudos do dia**: estudos e revisitas de hoje, com título em cada informação (dirigente, horário, local, telefone, observações).
- **Reunião de campo do dia**: horário, dirigente, local de encontro, território e observações.

Cada cartão some quando não houver nada para hoje. A mudança vale para os três lugares onde esse cartão aparece: o painel da esposa e o "Resumo da Semana" (comissão de anciãos e superintendente).

## 2. Tela de entrada mais elegante, com acesso direto por código
Tudo fica na mesma tela de login, sem cliques a mais:

```text
 Telefone ou e-mail  [            ]
 Senha               [            ]
 ───────────── ou ─────────────
 Você tem um código de acesso?
 [ Insira aqui o código          ]
 Para anciãos e esposa do superintendente
 [           Entrar              ]
```

- Quem tem conta preenche telefone e senha e toca em "Entrar", como hoje.
- Quem tem código preenche só o campo do código e toca no mesmo "Entrar". O app descobre sozinho se é acesso do corpo de anciãos ou da esposa do superintendente e abre o painel certo.
- Ao começar a digitar o código, os campos de telefone e senha ficam esmaecidos (e vice-versa), para ninguém se confundir.
- O campo do código aceita letras minúsculas e espaços (corrige sozinho). Se o código estiver errado: "Código não encontrado. Confira as letras e tente de novo."
- Uma linha pequena "Não tem o código? Peça ao superintendente." logo abaixo.
- O antigo link "Acesso visitante" sai da tela (a página do código continua funcionando para quem já tem o atalho).
- Visual mais limpo: cartão único, espaçamento maior, divisória "ou" discreta.

No link "Novo superintendente? Criar conta", aparece um pequeno "Como obter o código?" que abre uma janela simples explicando que o código é enviado pelo desenvolvedor, com botão "Pedir por e-mail" (abre o e-mail para wrscircuito@gmail.com com assunto já preenchido). A mesma dica aparece na tela de cadastro do superintendente, junto ao campo do código.

Nada muda no login com senha, no PIN, na biometria nem nos dados.

## Detalhes técnicos
- Cartões: dividir o bloco `guest.today.studiesField` em `visitante.painel.tsx` e nas duas ocorrências de `VisitSummaryView.tsx`, usando `InfoList`. Novas chaves i18n `guest.today.studies` / `guest.today.field` em pt/en/es.
- `LoginForm.tsx`: novo estado `accessCode`; `required` dos campos de conta só quando o código está vazio; no submit, se há código, chama o mesmo `getGuestSnapshot` usado em `visitante.index.tsx`, `saveGuestSession` e navega para `/visitante/painel` (o painel já decide anciãos x esposa por `snap.wifeMode`). Fluxo de senha intacto. Remove o link `/visitante`; adiciona diálogo "Como obter o código" com `mailto:`.
- `cadastro.superintendente.tsx`: dica com `mailto:` abaixo do campo código.
- Só tokens de cor existentes; textos novos em pt/en/es.
