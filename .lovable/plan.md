# Chave "Terça" desligável com aviso amigável

Só aparência. Nenhum dado salvo é apagado.

## Como fica

```text
+-----------------------------------------+
| DIAS DA VISITA   Terça [●]  Segunda [ ] |  <- chave liberada mesmo com itens
| ┆Ter•┆(Qua)(Qui)(Sex)(Sáb)(Dom)          |
+-----------------------------------------+
        toca para desligar
+-----------------------------------------+
|        Ocultar a terça-feira?           |
|                                         |
|  Este modelo já tem informações na      |
|  terça. Elas não serão apagadas: só     |
|  ficam escondidas aqui e voltam quando  |
|  você ligar a chave de novo.            |
|                                         |
|   [ Cancelar ]        [ Ocultar ]       |
+-----------------------------------------+
```

- Sem nada na terça: a chave desliga direto, como hoje.
- Com algo na terça: aparece o aviso acima. "Cancelar" mantém a terça; "Ocultar" esconde a pílula.
- Ao abrir um modelo que tem itens na terça, a chave vem ligada (a não ser que você já tenha desligado antes naquele modelo, escolha lembrada no aparelho).
- Itens escondidos continuam sendo salvos, enviados às visitas e exportados normalmente.
- Vale para Programação (Estudos e Revisitas, Refeições) e Campo. A Segunda continua como está.

## Detalhes técnicos
- `template-day-pills.ts`: `visibleTemplateDays` passa a aceitar `showTuesday: boolean | null` — `null` (nunca escolhido) usa `hasTuesdayItems`; `true/false` explícito vence. Testes: desligado explícito esconde mesmo com itens; sem escolha mostra quando há itens.
- `DayPills.tsx`: pref `:tuesday` lida como `boolean | null`; `tuesdayLocked` vira `tuesdayHasItems`; ao desligar com itens abre `AlertDialog` (shadcn) e só grava `false` ao confirmar.
- i18n pt/en/es para título, texto e botões do aviso.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
