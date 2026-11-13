# Plano: modelos de carta na nuvem

## O que encontrei
Os modelos de carta **já vão para a nuvem**. A conta IBE-01 tem 1 modelo guardado lá, atualizado hoje às 10:04. Mas há duas falhas, e elas explicam por que uma mudança feita num aparelho às vezes não aparece no outro:

1. **Leitura presa na cópia do celular.** Ao abrir os modelos, o app consulta a nuvem pelo mesmo caminho que travava os Grandes Eventos. Muitas vezes ele responde com a cópia antiga guardada no celular, e o modelo editado no outro aparelho não chega.
2. **Risco de sobrescrever.** Quando um envio fica pendente (por exemplo, sem internet), o app depois envia **todos** os modelos do celular de uma vez. Se você editou o mesmo modelo em outro aparelho nesse meio tempo, essa versão mais nova pode ser trocada pela antiga.

## O que vamos ajustar
1. Ao abrir "Modelos de carta" com internet, o app busca **direto na nuvem**, sem usar a cópia do celular.
2. Antes de enviar o que ficou pendente, o app confere a nuvem e envia **só os modelos mais novos** que os de lá. Nada mais recente é sobrescrito.
3. Um aviso discreto no topo mostra a situação, e o botão **"☁ Atualizar"** força a busca na hora:

```text
┌──────────────────────────────────────┐
│ Modelos de carta                     │
│ ☁ Sincronizado · 13/11 às 10:04      │
│                        [☁ Atualizar] │
│ ┌──────────────────────────────────┐ │
│ │ Convite padrão              ⋯    │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
  Outros avisos possíveis:
  "⏳ Aguardando internet para enviar"
  "📱 Só neste aparelho"
```

Nada muda nos seus modelos, nas cartas nem na formatação.

## Detalhes técnicos
- `letter-template-sync.ts`:
  - fazer as leituras e gravações dentro de `withNetworkWindow` e depois chamar `markTableStale("letter_templates")`;
  - em `flush`: buscar as linhas da nuvem, aplicar `mergeTemplates` e enviar só a lista `upload`; depois aplicar as exclusões pendentes;
  - novo `forceRefresh` para o botão.
- `LetterTemplates` / `BigEvents.tsx`: mostrar o aviso de situação com o horário da última sincronização e o botão "☁ Atualizar".
- Testes:
  - `flush` não sobrescreve um modelo mais novo da nuvem;
  - a leitura abre a janela de rede.
