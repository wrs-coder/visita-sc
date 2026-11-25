# Trocar as caixas de confirmação do navegador pela caixa do app

Você está certo: na Pauta ainda sobraram caixas do navegador ("confirm"). O app já tem a caixa própria no estilo iOS/One UI, usada na Lixeira e nos Modelos. Vou usar a mesma caixa nesses lugares, mantendo os mesmos textos e o mesmo comportamento.

## Como fica

```text
┌───────────────────────────────┐
│  Apagar o tópico "Pastoreio"? │
│  Os cartões dele também saem  │
│  da pauta.                    │
│                               │
│  ┌───────────┐ ┌────────────┐ │
│  │ Cancelar  │ │  Excluir   │ │ ← vermelho quando apaga
│  └───────────┘ └────────────┘ │
└───────────────────────────────┘
```

## Onde muda (Pauta)
- Apagar tópico e tirar cartão do tópico
- Trocar de modo com alterações não salvas (Salvar? / Descartar?)
- Atualizar a pauta com alterações não salvas
- Tirar anexo
- Apagar resposta dos anciãos
- Modelos da pauta: atualizar, apagar e voltar ao modelo original

## Outros dois lugares com a mesma caixa antiga
- Sair de Reuniões e Discursos com rascunho não salvo
- Pedido de permissão do cronômetro flutuante ("Sobrepor a outros apps")

Nada mais muda: textos, regras de salvar e dados ficam iguais.

## Detalhes técnicos
- Substituir `confirm(...)`/`window.confirm(...)` por `await appConfirm(...)` (src/components/ui/app-dialogs.tsx) em ElderAgendaView, AgendaAttachments, ElderInfoResponses, AgendaTemplatesDialog, MeetingFloatingTimer.
- MeetingsDraftContext: `useBlocker` aceita `shouldBlockFn` assíncrona → `async () => !(await appConfirm(...))`.
- Adicionar um teste que falha se aparecer `confirm(` nativo em src/ (exceto app-dialogs.tsx) e registrar a regra no instructions.md.
