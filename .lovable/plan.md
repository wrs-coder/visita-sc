# Plano: modelos de carta na nuvem

## O que encontrei
Os modelos de carta **já vão para a nuvem**. A conta IBE-01 tem 1 modelo guardado lá, atualizado hoje às 10:04. Mas há duas falhas, e elas explicam por que uma mudança feita num aparelho às vezes não aparece no outro:

1. **Leitura presa na cópia do celular.** Ao abrir os modelos, o app consulta a nuvem pelo mesmo caminho que travava os Grandes Eventos. Muitas vezes ele responde com a cópia antiga guardada no celular, e o modelo editado no outro aparelho não chega.
2. **Risco de sobrescrever.** Quando um envio fica pendente (por exemplo, sem internet), o app depois envia **todos** os modelos do celular de uma vez. Se você editou o mesmo modelo em outro aparelho nesse meio tempo, essa versão mais nova pode ser trocada pela antiga.

## O que vamos ajustar (igual aos Grandes Eventos)
1. **"☁ Baixar da nuvem"**: busca direto na nuvem e junta com o que está no celular. **Nunca apaga** um modelo que só existe no aparelho. Esse modelo ganha o selo "📱 Só neste aparelho".
2. **"☁↑ Enviar todos"**: manda para a nuvem os modelos que ainda não estão lá, ou que estão mais novos no celular.
3. **No ⋯ de cada modelo**: "Enviar para a nuvem" e "Receber da nuvem". Cada modelo mostra "☁ Atualizado: dia às hora".
4. **Sem sobrescrever:** antes de enviar o que ficou pendente, o app confere a nuvem. A versão mais nova sempre vence.
5. Contador no topo: **"Nuvem: X · Aparelho: Y"**.

```text
┌──────────────────────────────────────┐
│ Modelos de carta                     │
│ Nuvem: 1 · Aparelho: 2               │
│ [☁↓ Baixar]        [☁↑ Enviar todos] │
│ ┌──────────────────────────────────┐ │
│ │ Convite padrão              ⋯    │ │
│ │ ☁ Atualizado 13/11 às 10:04      │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Convite simpósio            ⋯    │ │
│ │ 📱 Só neste aparelho             │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Nada muda nos seus modelos, nas cartas nem na formatação.

## Detalhes técnicos
- `letter-template-sync.ts`:
  - leituras e gravações dentro de `withNetworkWindow`, seguidas de `markTableStale`;
  - novas funções `downloadAllTemplates` (junta a nuvem com o aparelho e devolve `localOnly` e `cloudCount`), `pushAllTemplates`, `pushTemplate(id)` e `pullTemplate(id)`;
  - `flush` passa a ler a nuvem e enviar só o `upload` de `mergeTemplates`.
- `LetterTemplates`: botões no topo, contador, selo em cada modelo, itens no menu ⋯ e o horário "Atualizado".
- Testes:
  - a junção nunca apaga um modelo que só existe no aparelho;
  - `flush` não sobrescreve um modelo mais novo da nuvem.
