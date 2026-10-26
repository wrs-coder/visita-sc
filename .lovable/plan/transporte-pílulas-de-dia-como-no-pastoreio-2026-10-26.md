# Transporte: pílulas de dia, como no Pastoreio

Só muda a forma de ver. Nenhum dado salvo, campo ou permissão muda.

## Como fica

```text
+-----------------------------------------+
| (Anciãos)(Estudos)(Reuniões)(Refeições) |
| (Transporte)                            |
+-----------------------------------------+
| Transporte                         (⤓)  |
+-----------------------------------------+
| [Ter 14•] (Qua 15•) (Qui 16) (Sex 17•)  |
| (Sáb 18) (Dom 19•) (Sem dia (1))        |
|  • = dia com transporte                 |
+-----------------------------------------+
| 🚗 Ter, 14 out                     ⌄    |
|  Motorista ...  Saída 08:30             |
|  Motorista ...  Volta 12:00             |
+-----------------------------------------+
| 🚗 Ter, 14 out                     ⌄    |
|  ... (todos os cards de terça)          |
+-----------------------------------------+
```

- As pílulas usam o mesmo dia escolhido na lista suspensa "Dia" de cada card. Mostram todos os dias da visita, com um ponto nos dias que têm transporte.
- Tocar num dia mostra só os cards daquele dia.
- Os cards sem dia definido ficam na pílula **"Sem dia (N)"**. Ela só aparece quando existir algum card assim, para que nenhum card fique escondido.
- Ao abrir, a tela mostra o dia de hoje durante a visita. Fora dela, mostra o 1º dia.
- Ao criar ou editar um transporte, a tela passa para o dia escolhido nele.
- Vale para anciãos e superintendente, igual às outras abas com dias.

## O que continua igual
Formulário de novo transporte (com a lista suspensa "Dia"), ativar ou desativar, "Dia inteiro", tempo real, relatório e "Recolher todos".

## Detalhes técnicos
- `_app.transporte.tsx`: reutilizar `useVisitDay` + `VisitDayPills` (chaves `yyyy-MM-dd` dos `days` da visita), com `hasItems` vindo de `groups`. Adicionar uma pílula extra "Sem dia", com a chave `__none__`, quando houver grupos com a chave `__none__:*`.
- Os grupos de outros dias recebem `hidden`, sem desmontar, então o estado aberto ou fechado e os rascunhos são mantidos. O hook fica antes do early return (`visit ? ... : []`).
- Depois de salvar, chamar `setActive(event_date ?? "__none__")`.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e uma captura em 393px.
