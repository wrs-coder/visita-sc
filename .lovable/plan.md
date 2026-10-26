# Resumo da semana para comissão / anciãos

## O que aconteceu (explicação)
- Nesta última mudança, eu **não tirei** "Resumo da semana" dos anciãos. Antes dela, o menu já mostrava esse item só para o superintendente; isso continua igual.
- A própria tela "Resumo da semana" manda de volta para o Início quem não é superintendente. Por isso hoje um ancião não consegue abri-la, nem pelo menu, nem pelo endereço direto.
- O que eu tirei do menu da comissão foram só "Cronograma" e "Itinerário".
- Se vocês já viram os anciãos usando essa tela, provavelmente era outro recurso parecido, como o relatório do resumo que o superintendente compartilha. Também pode ter sido uma versão mais antiga do app.

## Proposta (se você quiser liberar)
Liberar "Resumo da semana" **só para leitura** para a comissão de serviço (anciãos):
1. Mostrar o item no menu "Semana da visita" para a comissão, acima de "Programa da visita".
2. A comissão vê o resumo da visita da sua congregação, mas sem botões de editar, desativar ou mudar status.
3. Superintendente e esposa: nada muda.

```text
┌─────────────────────────────┐
│ Semana da visita            │
│  • Resumo da semana   (novo)│
│  • Programa da visita       │
└─────────────────────────────┘
```

## Detalhes técnicos
- Primeiro passo: confirmar se os dados do resumo vêm de uma função do servidor que só aceita superintendente. Se for assim, criar uma leitura separada, só de consulta, limitada à visita da congregação do ancião, sem mudar as regras atuais do banco.
- Trocar o redirecionamento em `_app.resumo-semana.tsx` por um modo somente leitura quando `role !== "superintendent"`.
- Adicionar o item no menu de `_app.tsx` e em `CommandPalette` (`superOnly` → comissão também).
- Testes: o superintendente continua editando; a comissão só vê; a esposa não vê a tela.
