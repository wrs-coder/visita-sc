# Grandes Eventos: Enviar / Receber da nuvem por evento

## Boa notícia primeiro
Conferi a sua conta na nuvem: **os 10 eventos e todas as partes continuam salvos lá**, nenhum foi apagado (nada mudou na nuvem nas últimas horas). O que sumiu foi só a lista mostrada no aparelho: a sincronização trocou a lista da tela pela cópia vazia que o celular tinha.

## O que vamos fazer

### 1. Proteção (para nunca mais "sumir")
- Se a sincronização trouxer uma lista vazia, mas a tela tinha eventos, o app **mantém o que está na tela** e mostra o aviso "Não consegui confirmar com a nuvem".
- Ao abrir Grandes Eventos com internet, o app sempre pede à nuvem primeiro; a cópia do celular só é usada sem internet.

### 1b. Botão "Baixar eventos da nuvem" (topo da tela)
- Novo botão ☁↓ ao lado do ⟳ em Grandes Eventos. Busca **direto na nuvem** todos os eventos e partes da sua conta, ignora a cópia do celular, e substitui a lista do aparelho.
- Funciona mesmo com a lista vazia, para recuperar os 10 eventos em todos os seus aparelhos.
- Mostra "10 eventos baixados" ao terminar; sem internet avisa "Sem conexão".

### 2. Nos três pontinhos de cada evento (abaixo de "Exportar")
- **Enviar para a nuvem** – grava este evento e suas partes na sua conta.
- **Receber da nuvem** – substitui este evento no aparelho pela versão da nuvem (pede confirmação).

### 3. Arrastar para o lado (igual aos esboços)
- Arrastar o cartão do evento para a **esquerda** = Enviar (verde).
- Arrastar para a **direita** = Receber (azul).

### 4. Última atualização
- Abaixo do título de cada evento: "Atualizado na nuvem: 13/11 às 17:40".

### 5. Apagar da nuvem
- **Manual:** o "Apagar evento" (⋯) já apaga da nuvem quando há internet. Vou garantir isso: sem internet, o app avisa "Será apagado da nuvem quando houver conexão" e completa depois. Ao apagar, pergunta "Apagar este evento de todos os aparelhos?".
- **Automático:** todo dia às 06:00 (já existe uma limpeza diária para o Cronograma), a nuvem também apagará os Grandes Eventos cuja data passou há **mais de 2 dias**, junto com as partes. Os links/PINs desses eventos deixam de funcionar. Eventos sem data nunca são apagados automaticamente.
- Nos aparelhos, ao sincronizar, eles somem também.

**Atenção:** este item 5 automático exige uma pequena mudança na rotina diária da nuvem (não muda tabelas nem permissões). Se preferir não mexer na nuvem, faço a exclusão automática só nos aparelhos.

## Mockup

```text
┌──────────────────────────────────┐
│ Grandes Eventos       ☁↓ ⟳  +   │
├──────────────────────────────────┤
│ ┌──────────────────────────────┐ │
│ │ Assembleia de Circuito   ⋯   │ │
│ │ 06/02/2027 · 11 partes       │ │
│ │ ☁ Atualizado: 13/11 17:40    │ │
│ └──────────────────────────────┘ │
│                                  │
│  Menu ⋯                          │
│  ┌────────────────────────────┐  │
│  │ + Nova parte               │  │
│  │ ⇪ Importar oradores        │  │
│  │ ⬇ Exportar                 │  │
│  │ ☁↑ Enviar para a nuvem     │  │
│  │ ☁↓ Receber da nuvem        │  │
│  │ 🔔 Lembrar pendentes       │  │
│  │ ⧉ Duplicar evento          │  │
│  │ 🗑 Apagar evento            │  │
│  └────────────────────────────┘  │
│                                  │
│  Arrastando para a direita:      │
│ ┌────────┬─────────────────────┐ │
│ │☁↓      │ Assembleia de Ci... │ │
│ │Receber │ 06/02/2027          │ │
│ └────────┴─────────────────────┘ │
└──────────────────────────────────┘
```

## Detalhes técnicos
- Exclusão automática: ampliar `delete_expired_circuit_events()` (job diário existente `cleanup-expired-circuit-events`) com `DELETE FROM circuit_big_event_parts WHERE event_id IN (eventos com event_date < CURRENT_DATE - 2)` e depois os eventos. Tombstones existentes propagam a exclusão aos aparelhos.
- Botão global: `forceDownloadAll()` faz select direto na nuvem (sem passar pelo leitor local), grava as linhas no espelho local (local-db) e atualiza a tela.
- `BigEvents.tsx`: `refreshStatuses` ignora resultado vazio quando a tela já tem eventos; novas funções `pushEvent(ev)` (upsert do evento + partes via cliente online) e `pullEvent(id)` (select direto na nuvem do evento + partes, grava no espelho local via local-db e atualiza estado).
- Envolver cada cartão com o `SwipeToSync` existente (`src/components/notes/SwipeToSync.tsx`), sem alterá-lo.
- "Última atualização" usa `updated_at` já existente na tabela. Sem mudança de banco/RLS.
- Teste novo: lista vazia da sincronização não apaga eventos da tela; pull de um evento substitui só ele.
