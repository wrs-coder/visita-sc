# Sincronizar por tela + correção dos links individuais

## (01) Sincronizar só a tela atual

Hoje o botão "Sincronizar" do topo baixa o app inteiro (todas as tabelas + todas as telas). Passa a ser assim:

```text
┌─────────────────────────────┐
│ ☰  Grandes Eventos     ⟳    │  <- topo: sincroniza SÓ esta tela
├─────────────────────────────┤
│  ...conteúdo da tela...     │
│                             │
└─────────────────────────────┘
   toque no ⟳ → "Grandes Eventos atualizado" (2-3 s)

┌─────────────────────────────┐
│ ‹  Meu perfil               │
├─────────────────────────────┤
│  SINCRONIZAÇÃO              │
│ ┌─────────────────────────┐ │
│ │ ⟳ Sincronizar tudo      │ │  <- só aqui
│ │   Última: hoje 03:12    │ │
│ │   Automática: 1x por dia│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- O ⟳ do topo (e do menu lateral) primeiro envia o que estiver pendente no aparelho, depois baixa apenas os dados da tela aberta e recarrega a tela. O aviso mostra o nome da tela.
- Cada tela tem sua lista de dados (ex.: Grandes Eventos = eventos + partes + modelos de carta; Refeições = refeições + notas do dia; Programa dos Anciãos = suas seções; Painel = visitas e itens do dia; Esboços = esboços pessoais). Uma tela que não estiver na lista usa o "Sincronizar tudo" como reserva, para nunca ficar sem atualizar.
- "Sincronizar tudo" fica só no Meu perfil (o mesmo processo completo de hoje).
- Automática: passa de 2x para **1x por dia**, de madrugada (janela 02:00–05:00, hora do aparelho, com alguns minutos de sorteio por aparelho para os celulares não baterem no servidor ao mesmo tempo). Se o app não estiver aberto nesse horário, roda na primeira abertura do dia, só com internet, sem travar a tela.

## (02) Confirmação de um orador "voltando" para Aguardando

Causa encontrada: a resposta do orador é gravada certa no servidor (por isso a carta mostra Confirmado/Recusado). Mas a tela Grandes Eventos lê as partes da **cópia guardada no aparelho**, e essa cópia não recebe a resposta que chega ao vivo — só a tela muda. Na resposta seguinte, a tela é recarregada a partir da cópia antiga e a confirmação anterior aparece de novo como "Aguardando". Nada foi perdido no servidor.

Correção:
- Quando chegar uma resposta ao vivo, gravar também na cópia do aparelho (status, data da resposta, motivo).
- Ao abrir Grandes Eventos com internet, buscar as partes direto do servidor (rápido, com tempo-limite) e atualizar a cópia; sem internet continua usando a cópia.
- O ⟳ da tela Grandes Eventos (item 01) também resolve na hora.

## Detalhes técnicos
- Novo `src/lib/screen-sync.ts`: mapa rota → tabelas espelhadas (`MIRROR_TABLES`), `syncScreen(path)` = `flushQueue()` + `syncTables({ tables, pull: supabasePull })` + `queryClient.invalidateQueries` + evento `screen-synced` que as telas ouvem para recarregar. Teste: cada rota mapeada só usa tabelas de `MIRROR_TABLES`; rota sem mapa cai no completo.
- `SyncButton` recebe modo `screen` (topo/menu) usando `useRouterState().location.pathname`; Perfil ganha cartão com `runDeviceSync` (modo atual).
- `local-auto-sync.ts`: janelas manhã/tarde → uma janela diária 02:00–05:00 + jitter estável por usuário; fora da janela, 1 execução na primeira abertura do dia. Atualizar `local-auto-sync.test.ts`.
- `BigEvents.tsx`: handler realtime chama gravação no espelho (`local-db`) da linha atualizada; `load()` busca da rede com timeout quando online e regrava o espelho. Teste para a mesclagem do status no espelho.
- Sem mudança no banco de dados. Textos novos em pt/en/es.
