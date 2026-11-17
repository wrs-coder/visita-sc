# Plano: Grandes Eventos, Modelos de visita e Checklist

## (01) Grandes Eventos

**(01.1) Não apaga sozinho 2 dias depois do evento**
Causa confirmada: a limpeza automática diária só apaga eventos do *Cronograma*. Não existe nenhuma limpeza para Grandes Eventos.
Correção: criar uma limpeza diária no servidor que apaga o Grande Evento (e as partes dele) quando já passaram 2 dias da data do evento. Eventos sem data não são apagados.

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
Causa provável (a confirmar antes de corrigir): a tela busca os modelos uma única vez ao abrir. Se essa busca falha (login ainda carregando, internet lenta), a tela fica vazia sem aviso e não tenta de novo.
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

## Detalhes técnicos
- Migration: `delete_expired_big_events()` SECURITY DEFINER (`event_date < CURRENT_DATE - 2`, apaga as partes antes), com cron diário; triggers `record_sync_tombstone` em `circuit_big_events` e `circuit_big_event_parts`.
- `BigEvents.tsx` `removeEvent`: atualização otimista do estado + remoção das linhas do evento e das partes no local-db.
- `_app.modelos.tsx`: item de exclusão (nova função de servidor `deleteTemplate`, só do dono, apaga `program_template_items` e depois o template); `load` com fallback no mirror local, nova tentativa quando auth/online mudam e proteção contra lista vazia.
- `ChecklistPanel.tsx`: ao salvar `info_text` com texto (trim), enviar também `status: "done"` no mesmo update.
- Testes: limpeza (regra dos 2 dias), checklist que marca sozinho e exclusão de modelo; i18n pt/en/es.
