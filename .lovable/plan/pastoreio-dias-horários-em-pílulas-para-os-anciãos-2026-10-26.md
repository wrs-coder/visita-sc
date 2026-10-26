# Pastoreio: dias/horários em pílulas para os anciãos

Só aparência e forma de escolher. Nenhum campo salvo, permissão ou regra do banco muda. Para o superintendente a lista suspensa continua como está hoje.

## Como fica para os anciãos

```text
+-----------------------------------------+
| (Perguntas do SC)(PASTOREIO)...         |
+-----------------------------------------+
| PASTOREIO                               |
| Escolha os dias para pastoreio          |
| (Qua, 10:30 ✓)(Sáb, 19:00 ✓)            |
| (Dom, 10:00)  <- apagada                |
|                                         |
| ⓘ O superintendente tem 2 pastoreios    |
|   disponíveis. Os 2 já foram marcados.  |
|   Para usar outro dia, troque um dos    |
|   dias escolhidos.                      |
+-----------------------------------------+
| Qua, 10:30 · Família Souza         ⌄    |
|  Ancião acompanhante  [........]        |
|  Família / Endereço   [........]        |
|  [⇄ Trocar o dia/hora do pastoreio]     |
+-----------------------------------------+
| Sáb, 19:00 · Irmão Lima            ⌄    |
|  ...                                    |
|  [⇄ Trocar o dia/hora do pastoreio]     |
+-----------------------------------------+
```

- Cada pílula é um dia/horário criado pelo superintendente.
- Tocar numa pílula livre marca esse dia no próximo pastoreio ainda sem dia.
- Quando todos os pastoreios já têm dia, as pílulas livres ficam apagadas e aparece a mensagem com o número de pastoreios disponíveis.
- Enquanto ainda faltar escolher: "Restam 1 de 2 pastoreios para escolher o dia."
- Tocar numa pílula marcada leva até o pastoreio daquele dia, abaixo.

### Trocar o dia/hora

```text
+-----------------------------------------+
| Trocar o dia/hora do pastoreio          |
| Atual: Qua, 10:30                       |
| Dias disponíveis:                       |
| (Dom, 10:00)                            |
|                                         |
| As informações vão para o novo dia e    |
| a Quarta fica livre.                    |
|              [Cancelar]                 |
+-----------------------------------------+
```

- Mostra só os dias ainda não escolhidos.
- Ao escolher, família, acompanhante, endereço e observações seguem para o novo dia e o dia anterior fica livre.
- Esse é o único jeito de trocar quando o limite já foi atingido, então dois pastoreios nunca caem no mesmo dia.

## O que continua funcionando
- O superintendente continua com a lista suspensa e o aviso de conflito de hoje.
- Relatório, envio ao Cronograma, senha da aba e rascunhos não mudam.
- Os pastoreios que já têm dia continuam com o mesmo dia.

## Detalhes técnicos
- Helper puro `src/lib/pastoral-slots.ts` com teste: `slotState(slots, events)`, que retorna os usados, os livres, quantos restam e se atingiu o limite, além de `nextEventWithoutSlot`.
- Em `_app.programa-ancioes.tsx`, na aba pastoral para quem não é superintendente: as pílulas de slots substituem as pílulas atuais por prefixo de dia (`slotDay`). O toque grava `saveField(ev, { slot_label })` no próximo evento sem slot. Tocar numa pílula usada expande ou rola até `ev:<id>`.
- Em `EventCard`, para anciãos: o Select dá lugar ao rótulo e ao botão "Trocar o dia/hora", que abre um Dialog com os slots livres e grava `onChange({ slot_label: novo })`. Os dados ficam na mesma linha, então "copiar e zerar" é a própria troca do slot.
- Textos novos no i18n pt/en/es. Validar com `bunx tsgo --noEmit`, `bunx vitest run` e uma captura em 393px.
