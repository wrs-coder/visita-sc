# Pastoreio: um dia por vez, sem título repetido e pílulas com só a primeira letra maiúscula

Muda só a aparência e a navegação. Nenhum dado salvo, permissão ou regra de senha muda.

## (01) Um dia por vez

Hoje, na visão dos anciãos, todos os pastoreios aparecem juntos, um embaixo do outro. A proposta é que a pílula de um dia já escolhido funcione como aba e mostre só o pastoreio daquele dia.

```text
+-----------------------------------------+
| (Perguntas do SC)(Pastoreio)(Encoraja-  |
| mento)(Recomendações)(Assuntos locais)  |
+-----------------------------------------+
| Escolha os dias para pastoreio          |
| [Qua, 10:30 ✓] (Sáb, 19:00 ✓)           |
|  ^ selecionada  ^ escolhida             |
| (Dom, 10:00) <- livre                   |
| ⓘ Restam 1 de 3 pastoreios para         |
|   escolher o dia.                       |
+-----------------------------------------+
| Informações adicionais do SC       ›    |
+-----------------------------------------+
| Qua, 10:30 · Família Souza         ⌄    |
|  Ancião acompanhante  [........]        |
|  Família / Endereço   [........]        |
|  [⇄ Trocar o dia/hora do pastoreio]     |
+-----------------------------------------+
   (só o pastoreio de Quarta aparece)
```

- Tocar numa pílula com ✓ mostra só o pastoreio daquele dia. A pílula fica com a cor principal.
- Tocar numa pílula livre marca o dia no próximo pastoreio sem dia, e a tela já passa a mostrar esse dia.
- Se ainda houver pastoreios sem dia, aparece uma pílula **"Sem dia (N)"** para chegar até eles. Assim nenhum pastoreio fica escondido.
- Ao trocar o dia/hora, a tela acompanha o pastoreio até o novo dia.
- Ao abrir a tela, ela mostra o primeiro dia escolhido. Se nenhum dia tiver sido escolhido ainda, mostra os pastoreios sem dia.
- Para o superintendente, as pílulas de dia já mostram um dia por vez. A pílula "Todos" continua disponível.

## (02) Título "VISITAS DE PASTOREIO"
Concordo que não é necessário, porque a pílula "Pastoreio" já diz onde a pessoa está. A proposta é tirar esse título grande de todas as quatro pílulas (Pastoreio, Encorajamento, Recomendações e Assuntos locais). O botão de recolher passa para a linha "Informações adicionais do SC".

Os títulos longos, como "ENCORAJAMENTO — INATIVOS, DOENTES…", não somem: viram uma linha curta e discreta, só nas abas em que explicam algo a mais. Na aba Pastoreio, essa linha não aparece.

## (03) Maiúsculas ou "Pastoreio"?
A recomendação é **"Pastoreio"**, com só a primeira letra maiúscula. É o padrão do iOS e do One UI: lê-se mais rápido, ocupa menos espaço (menos quebras de linha no celular) e não passa a sensação de "grito". As letras todas maiúsculas ficam só para rótulos pequenos de seção, como "INFORMAÇÕES".

- Aplicar nas pílulas da aba Anciãos: Perguntas do SC, Pastoreio, Encorajamento, Recomendações e Assuntos locais.
- As outras pílulas do app (Modelos, Programa da visita, dias) já seguem esse padrão. Vou conferir todas e corrigir qualquer uma que esteja em maiúsculas.

## O que continua igual
Regra de limite de pastoreios, "Trocar o dia/hora", envio ao Cronograma, relatório, senha da aba e rascunhos. Os rascunhos continuam guardados, porque os pastoreios de outros dias só ficam escondidos e não são descartados.

## Detalhes técnicos
- `_app.programa-ancioes.tsx`: novo estado `elderSlot` (slot | "__none__"). A lista da seção pastoral para quem não é superintendente filtra por `slot_label === elderSlot` ou pelos que não têm slot. Os itens não exibidos recebem `hidden` em vez de filtro, para manter o estado do EventCard. O toque na pílula usada faz `setElderSlot`, e o toque na livre grava e também seleciona.
- Helper puro `pickElderSlot(used, current, hasUnslotted)` em `pastoral-slots.ts`, com teste para o dia inicial e para o ajuste quando o dia selecionado é liberado.
- Remover o `<h2>` de `SECTION_TITLES`. `CollapseIdToggle` passa para a linha de `TemplateExtraBlock`, e o subtítulo curto fica em `text-xs text-muted-foreground`.
- `ELDER_TAB_LABELS` com só a primeira letra maiúscula. Usar `rg` para encontrar pílulas com `uppercase` ou rótulos em caixa alta e alinhar.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e uma captura em 393px.
