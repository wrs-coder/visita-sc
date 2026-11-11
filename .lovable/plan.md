# Grandes Eventos: escolher cartas, painel Exportar, novo link ao trocar orador, aviso de SC/filial

## (01) Escolher quais cartas gerar em "PDF individuais (.zip)"

Ao tocar em "PDF individuais (.zip)", o painel Exportar troca para uma lista de escolha, no estilo iOS/One UI.

```text
┌─────────────────────────────────┐
│ ‹ Voltar   Escolher cartas      │
│                                 │
│ 6 de 9 selecionadas             │
│ [Todas]  [Nenhuma]  [Pendentes] │
│ ┌─────────────────────────────┐ │
│ │ ☑ Nº 1 · Por que confiar em │ │
│ │   Jeová de todo o coração?  │ │
│ │   João Silva · Central      │ │
│ ├─────────────────────────────┤ │
│ │ ☐ Nº 2 · Baraque            │ │
│ │   Pedro Lima · Jardim Sul   │ │
│ │   Recusou                   │ │
│ ├─────────────────────────────┤ │
│ │ ☑ Nº 3 · A mulher sunamita  │ │
│ │   ...                       │ │
│ └─────────────────────────────┘ │
│                                 │
│ [   Gerar 6 cartas (.zip)    ]  │
└─────────────────────────────────┘
```

- Cada linha mostra Nº, tema, orador e congregação. A lista rola e o painel fica do mesmo tamanho.
- Na primeira vez, todas vêm marcadas. Atalho "Pendentes" marca só quem ainda não respondeu.
- Partes do Superintendente de circuito e do Representante da filial não aparecem na lista, porque não recebem carta (isso já acontece hoje).
- Se você escolher só 1 carta, o app salva o PDF direto, sem .zip.
- Só as cartas escolhidas ganham PIN ou link. As outras ficam como estão.

## (02) Caixas do painel Exportar saindo para fora

Os textos longos não quebravam linha e empurravam as caixas para fora do painel. Agora o texto quebra em duas linhas e cada caixa ocupa só a largura do painel.

```text
┌───────────────────────────┐
│ Exportar                × │
│ ┌───────────────────────┐ │
│ │ PDF individuais (.zip)│ │
│ │ Uma carta por orador, │ │
│ │ com "Clique aqui"     │ │
│ └───────────────────────┘ │
└───────────────────────────┘
```

## (03) Orador trocado = novo link ou novo PIN automático

Quando você troca o nome do orador numa parte que já tinha convite:
- Modo link pessoal: o app cria um link novo. O link antigo para de funcionar.
- Modo PIN: o app cria um PIN novo. O PIN antigo para de funcionar.
- A resposta volta para "Aguardando", porque quem confirmou foi o orador anterior.
- Um aviso curto aparece: "Novo orador: link renovado. Envie o novo convite."
- Corrigir só maiúsculas ou espaços no nome não troca nada.

## (04) Sem aviso "Este ancião também está na parte" para SC e filial

Partes do Superintendente de circuito e do Representante da filial deixam de mostrar e de causar esse aviso. Ele continua para anciãos repetidos.

## Detalhes técnicos
- `BigEvents.tsx`: nesta tela não existe fluxo novo. O Dialog de exportação ganha um passo `pick` com estado `Set<partId>`. `letterModels(ev, ids?)` filtra pelos ids escolhidos antes de criar PIN/token. `exportPdfs` recebe os ids e, quando houver 1 item, chama `saveBlob` direto com o PDF.
- Botões do Dialog: `whitespace-normal`, `min-w-0` e spans com `break-words`. Lista com `max-h-[55vh] overflow-y-auto`.
- `savePart`: quando `existing` existe e o nome normalizado (trim + minúsculas) mudou, inclui `status: "pending"`. Inclui também `personal_token: crypto.randomUUID()` se havia token, ou `pin_hash: null` seguido de `newPin(ev, part)` se havia PIN. O banco não muda.
- `byName`/`alsoIn`: considerar só `assigned_to === "speaker"`.
- Testes: lógica pura de seleção (`pickLetterParts`) e regra de troca de orador (`speakerChanged`) em `big-events-layout.test.ts`.
