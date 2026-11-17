# Plano: Grandes Eventos, Modelos de visita e Checklist

## (01) Grandes Eventos

**(01.1) Não apaga sozinho 2 dias depois do evento**
Você tem razão: a limpeza foi feita no plano anterior e roda todo dia às 3h (horário de Brasília). Hoje ela rodou sem erro. Mesmo assim, a Assembleia de 14/11 ainda está na nuvem.
Causa provável (a confirmar no primeiro passo): o celular guarda uma cópia do evento e, ao sincronizar, envia de novo para a nuvem o que a limpeza apagou. É o mesmo defeito do item (01.2), então uma correção resolve os dois.
Correção: a limpeza também passa a registrar a exclusão, e o aparelho apaga sua cópia em vez de reenviá-la. Nada muda na regra: o evento some no 3º dia depois da data.

**(01.2) "Apagar evento" e ele volta**
Causa confirmada: as tabelas de Grandes Eventos não registram a exclusão para os outros aparelhos (as outras tabelas registram). O evento some da nuvem, mas a cópia guardada no celular continua lá e a tela o mostra de novo.
Correção:
- registrar as exclusões de eventos e partes, como já é feito nas outras telas;
- ao apagar, remover na hora também da cópia do celular;
- se estiver sem internet, guardar o pedido e apagar da nuvem quando a conexão voltar.

```text
┌──────────────────────────────┐
│ Grandes Eventos              │
│ ┌──────────────────────────┐ │
│ │ Assembleia 15/11      ⋯  │ │
│ └──────────────────────────┘ │
│  Apagar → some na hora e     │
│  não volta mais, em nenhum   │
│  aparelho                    │
└──────────────────────────────┘
```

## (02) Modelos de visita

**(02.1) Excluir modelo em "Programação pessoal"**
Botão "Excluir modelo" no menu do modelo ativo, com confirmação. Apaga o modelo e os itens dele. As visitas que já usaram o modelo ficam como estão (elas guardam uma cópia).

```text
┌──────────────────────────────┐
│ Programação pessoal          │
│ [Modelo 1] [Modelo 2]  [+]   │
│ Modelo 1             ⋯       │
│            ┌───────────────┐ │
│            │ Renomear      │ │
│            │ Exportar      │ │
│            │ 🗑 Excluir     │ │ ← vermelho
│            └───────────────┘ │
├──────────────────────────────┤
│  Excluir "Modelo 1"?         │
│  As visitas já feitas não    │
│  mudam.                      │
│     [Cancelar]  [Excluir]    │
└──────────────────────────────┘
```

**(02.2) Modelos aparecendo vazios**
Aconteceu só no app instalado no notebook; no celular funcionou. Causa provável (a confirmar antes de corrigir): a tela busca os modelos uma única vez ao abrir. Se essa busca falha (login ainda carregando, internet lenta), a tela fica vazia sem aviso e não tenta de novo.
Correção:
- mostrar primeiro a cópia guardada no celular;
- tentar de novo automaticamente quando o login ficar pronto ou a internet voltar;
- nunca trocar uma lista com modelos por uma vazia sem confirmar na nuvem;
- conferir as outras telas de modelos (Checklist, Reuniões, Campo, Anciãos), que podem ter o mesmo problema.

**(02.3) Checklist: "Informação" preenchida já marca como concluída**
Quando o campo "Informação" de uma pergunta é salvo com texto, a pergunta fica marcada como concluída na hora. Apagar o texto não desmarca, para não perder uma marcação manual. A pessoa ainda pode desmarcar à mão.

```text
┌──────────────────────────────┐
│ ☑ Quantos publicadores?      │
│   Informação: 84         ✓   │
│ ☐ Pioneiros regulares?       │
│   Informação: (vazio)        │
└──────────────────────────────┘
```

## (03) Grandes Eventos › Modelos de cartas: exportar e importar

Para partilhar modelos com outros SCs. O arquivo exportado **não leva o Timbre** (título, circuito, endereço e telefone do cabeçalho) **nem a Assinatura**. Ao importar, esses campos são preenchidos com os dados do seu perfil, como já acontece num modelo novo. O estilo do cabeçalho e os textos da carta vão no arquivo.

```text
┌──────────────────────────────┐
│ Modelos de cartas      ⋯     │
│            ┌───────────────┐ │
│            │ ⬆ Exportar     │ │
│            │ ⬇ Importar     │ │
│            └───────────────┘ │
├──────────────────────────────┤
│ Exportar                     │
│ ◉ Só este modelo             │
│ ○ Todos os modelos           │
│ Timbre e Assinatura não vão  │
│ no arquivo.                  │
│       [Cancelar] [Exportar]  │
└──────────────────────────────┘
```

Importar: escolhe o arquivo e mostra a lista dos modelos para confirmar. Se já existir um modelo com o mesmo nome, o importado entra como "Nome (importado)". Nada é substituído.

## Detalhes técnicos
- Migration: a função de limpeza já existente (`delete_expired_circuit_events`, que já cobre Grandes Eventos) é mantida; adicionar triggers `record_sync_tombstone` em `circuit_big_events` e `circuit_big_event_parts`.
- Investigar primeiro em `big-events/cloud-sync.ts` se a fila/merge "never deletes device-only" reenvia eventos apagados na nuvem; com o tombstone, linha ausente na nuvem e com tombstone é apagada localmente, nunca reenviada.
- `BigEvents.tsx` `removeEvent`: atualização otimista do estado + remoção das linhas do evento e das partes no local-db.
- `_app.modelos.tsx`: item de exclusão (nova função de servidor `deleteTemplate`, só do dono, apaga `program_template_items` e depois o template); `load` (PWA desktop: conferir se o service worker serve resposta antiga) com fallback no mirror local, nova tentativa quando auth/online mudam e proteção contra lista vazia.
- `ChecklistPanel.tsx`: ao salvar `info_text` com texto (trim), enviar também `status: "done"` no mesmo update.
- Testes: limpeza (regra dos 2 dias), checklist que marca sozinho e exclusão de modelo; i18n pt/en/es.
- Modelos de cartas: novo `letter-template-share.ts` (funções puras) que gera um arquivo `.json` versionado (`{kind:"visitasc-letter-templates",version:1,templates}`), remove `headerTitle/headerSubtitle/headerAddress/headerPhone/signature`, e na importação valida o formato e o tamanho, ignora campos desconhecidos, gera ids novos, preenche o timbre pelo perfil (mesma lógica do modelo inicial) e salva pelo fluxo atual de `letter-template-sync.ts`. A exportação usa o `share.ts` existente (celular) ou download (web). Botões no `LetterTemplates.tsx`. Testes: arquivo sem timbre/assinatura, importação com ids novos e sem sobrescrever.
