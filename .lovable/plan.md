# Visual mais enxuto nos modelos (Programação, Reuniões de campo, Anciãos)

## Por que não foi feito
Na reorganização econômica, os pedidos viraram 3 etapas: pílulas de dias, semanas sem congregação e aba única com pacotes. Este item ("Visual mais enxuto") ficou fora das 3 etapas e não entrou na lista de tarefas, por isso foi esquecido. Conferido no código: as três telas ainda têm a coluna de modelos ao lado, nenhum menu de três pontinhos, nenhuma barra fixa no rodapé e os itens começam abertos.

## Como fica no celular

```text
+-----------------------------------------+
| (Programação)(Campo)(Anciãos)(Pacotes)  |
+-----------------------------------------+
| Modelo: [ Visita padrão         v ] [⋮] |  <- ⋮ = Renomear, Duplicar,
+-----------------------------------------+     Excluir, Exportar, Importar
| (Ter)(Qua)(Qui)(Sex)(Sáb)(Dom)          |
| > Informações adicionais                |  <- fechada até tocar
| > Manhã · 08:30 · Casa em casa      [x] |  <- itens começam fechados
| > Tarde · 15:00 · Testemunho        [x] |
|   (aberto) ... campos principais        |
|   > Mais detalhes (observações, oração) |
+-----------------------------------------+
| [+ Adicionar]             [ Salvar ]    |  <- barra fixa no rodapé
+-----------------------------------------+
```

- No computador, a lista de modelos continua na coluna ao lado.
- Itens começam fechados mostrando o resumo; um toque abre. O que você abrir fica lembrado no aparelho, como hoje.
- "Adicionar" cria no dia escolhido. "Salvar" faz o mesmo de hoje.

## O que não muda
Dados salvos, regras de gravação, importar/exportar, propagação para visitas, acessos (só o superintendente edita modelos; anciãos, comissão e esposa não são afetados).

## Detalhes técnicos
- `CollapseProvider` ganha opção `defaultCollapsed` (só presentação, localStorage como hoje); usada nas três telas de modelos.
- Componente compartilhado `TemplatePickerBar`: `Select` + `DropdownMenu` (⋮) visível em `md:hidden`; coluna lateral mantém `hidden md:block`.
- Componente `TemplateFooterBar`: `sticky bottom-0` com tokens `bg-background/95 border-t`, respeitando a área segura do Android.
- "Mais detalhes": `Collapsible` dentro do editor do item para observações/oração final.
- i18n pt/en/es; validar com `bunx tsgo --noEmit`, `bunx vitest run` e captura em 393px.
- Item entra no roadmap.
