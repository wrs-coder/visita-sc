# Padrão único nas telas de modelos + textos novos

## O que muda (visão do usuário)

Todas as 5 telas de modelos (Programação pessoal, Checklist, Campo, Discursos, Anciãos) passam a ter o mesmo topo: um título curto, uma frase de apoio e **uma única linha** com três peças.

```text
+-----------------------------------+
| [Progr.][Check][Campo][Disc][...] |  <- pílulas de abas (já existem)
|                                   |
| Programação pessoal               |
| Organize a sua disponibilidade    |
| para Estudos e Revisitas,         |
| Refeições e solicitação de        |
| transporte.                       |
|                                   |
| (+ Novo v) [ Visita Jan 2026  v ] (⋮) |
|                                   |
| > Informações adicionais do   •   |  <- recolhível, logo abaixo
|   superintendente                 |
|                                   |
| (Estudos)(Refeições)(Transporte)  |
| (Ter•)(Qua)(Qui•)(Sex)(Sáb)(Dom)  |
| ...itens recolhidos com resumo... |
|-----------------------------------|
| [ + Adicionar ]      [ Salvar ]   |  <- barra fixa (já existe)
+-----------------------------------+
```

Pílula "+ Novo" (toque abre menu pequeno):
```text
 ( + Novo v )
 +----------------+
 | + Novo modelo  |
 | ⤓ Exportar     |
 | ⤒ Importar     |
 +----------------+
```

Três pontinhos (⋮):
```text
 +----------------+
 | ✎ Renomear     |
 | ⧉ Duplicar     |
 |----------------|
 | 🗑 Excluir      |  (vermelho)
 +----------------+
```

Regras:
1. **Seletor só mostra modelos criados.** Em Programação pessoal some a lista "Modelo 8, Modelo 9, Modelo 10" de vagas vazias. "+ Novo modelo" usa a próxima vaga livre e pede o nome; se as 10 vagas estiverem ocupadas, o item fica desativado com aviso "Limite de 10 modelos".
2. **O seletor já indica o modelo escolhido**: some o campo "Nome do modelo" repetido dentro do cartão (renomear passa a ser pelo ⋮) e some a lista lateral no celular nas telas que ainda a mostram.
3. **"Informações adicionais do superintendente"** aparece logo abaixo da linha do seletor, recolhível, igual à aba Campo.
4. Nada muda em quem pode editar (só o superintendente), nos dados salvos ou nas visitas já criadas.

## Textos

- Programação pessoal — título "Programação pessoal"; frase "Organize a sua disponibilidade para Estudos e Revisitas, Refeições e solicitação de transporte."
- Reuniões de campo — título "Reuniões de campo"; frase "Organize as reuniões de campo de acordo com horários e modalidades." Remover o aviso "Cada turno tem sua própria modalidade…".
- Reuniões e Discursos — título "Reuniões e Discursos"; frase "Organize as reuniões do Meio de Semana, Fim de Semana, Pioneiros e Anciãos/Servos."
- Programação Anciãos — título "Programação Anciãos"; frase "Organize a sua disponibilidade para visitas de pastoreio, encorajamentos especiais e colete informações referentes à reunião com os anciãos."
- Contadores "4/24 modelos" saem do subtítulo.

## Reuniões de campo — "Mais detalhes"

```text
+-----------------------------------+
| Ter · 09:00 · Casa em casa     ^  |
| Horário [09:00]  Modalidade [v]   |
| Dirigente [ ............ ]        |
| Local de saída [ ........ ]       |
| > Mais detalhes               •   |
|   Observações [ ... ]             |
|   Nº território S-13 [ ... ]      |
|   Localização território [ ... ]  |
|   Dirigentes auxiliares [ ... ]   |
|   Oração final [ ... ]            |
+-----------------------------------+
```
O ponto azul aparece se qualquer um desses campos estiver preenchido.

## Detalhes técnicos

- `TemplateChrome.tsx`: novo `TemplateNewMenu` (pílula "+ Novo" com DropdownMenu: novo/exportar/importar, reutiliza `useTemplateIO`) e `TemplateHeaderRow` (Novo + `TemplatePicker` + `TemplateActionsMenu`). `TemplateActionsMenu` deixa de exibir exportar/importar quando usado na linha nova (prop `io` não passada). `TemplatePicker` passa a aparecer também no computador nessas telas.
- `_app.modelos.tsx`: seletor filtra `SLOTS` por slots com modelo salvo; "+ Novo" cria na primeira vaga livre via `fnUpsert` com nome digitado; Renomear abre prompt e chama `renameSlot`; Excluir usa a função de exclusão de modelo existente (confirmar no código; se não houver, Excluir fica oculto nesta tela); remover input "Nome do modelo"; trocar o seletor + Duplicar inline pelo `TemplateHeaderRow` (Duplicar continua escolhendo a vaga de destino).
- `_app.checklist-modelos.tsx` e `_app.modelo-reunioes-discursos.tsx`: substituir `TemplateIOButtons` e lista lateral móvel pelo `TemplateHeaderRow`, mantendo os handlers atuais de criar/renomear/duplicar/excluir/exportar/importar.
- `_app.modelo-reunioes-de-campo.tsx` e `_app.modelo-programacao-ancioes.tsx`: trocar o cabeçalho atual pelo `TemplateHeaderRow`; em Campo remover `templates.field.hint` e mover S-13, localização e auxiliares para o `InfoDisclosure` "Mais detalhes".
- i18n pt/en/es: atualizar `templates.program.title/subtitle`, `templates.field.title/subtitle`, `templates.meetingTalk.title/subtitle`; adicionar `templates.chrome.new`, `templates.chrome.newTemplate`, `templates.chrome.limitReached`.
- Sem mudanças no banco. Validar com `bunx tsgo --noEmit` e `bunx vitest run`; conferir no celular (393px) com Playwright as 5 telas.
