# Modelos numa aba só, Pacotes da visita e semanas sem congregação

Nada muda no banco, no login nem no que os modelos geram nas visitas.

## 1. Aba única "Modelos"
- A barra lateral passa a ter um só item **Modelos** no lugar dos 5 atuais.
- No topo da aba, pílulas para escolher o tipo: **Programação · Checklist · Reuniões de campo · Reuniões e discursos · Anciãos · Pacotes**. A escolha fica no endereço da página, então voltar/atualizar mantém a pílula.
- Os endereços antigos continuam funcionando e abrem a aba única já na pílula certa (atalhos e links salvos não quebram).

## 2. Visual mais enxuto (Programação, Reuniões de campo, Anciãos)
- Lista de modelos vira um **seletor compacto** no topo (no celular) em vez de uma coluna inteira; no computador continua ao lado.
- Ações Renomear / Duplicar / Excluir / Exportar / Importar vão para um **menu de três pontinhos**.
- "Informações adicionais" vira uma linha recolhível (abre só quando tocada).
- Itens já começam **recolhidos mostrando o resumo** (ex.: "Manhã · 08:30 · Casa em casa"); abrir um item é um toque. Grupos por dia continuam.
- Barra fixa no rodapé com **Adicionar** e **Salvar**, sempre à mão, sem precisar rolar até o fim.
- Campos menos usados (observações, oração final) ficam numa área "Mais detalhes" dentro do item.

## 3. Pacotes da visita (pílula "Pacotes")
- Criar, renomear, duplicar e excluir pacotes.
- Em cada pacote, escolher um modelo de cada tipo: Programação, Checklist, Reuniões de campo, Reuniões e discursos, Anciãos (cada campo pode ficar vazio). Um mesmo modelo pode estar em vários pacotes.
- Guardados **só neste aparelho**, separados por usuário.
- **Exportar/Importar** pacote no mesmo esquema dos modelos atuais: o arquivo leva o pacote **e os modelos dele**; ao importar em outro aparelho Visita SC, os modelos são criados e o pacote passa a apontar para eles.
- Se um modelo do pacote for excluído, o pacote mostra "modelo não encontrado" naquele campo, sem quebrar.

## 4. Itinerário: usar pacote
- Ao criar/editar uma visita, novo seletor **"Pacote da visita"** acima dos seletores de modelo. Escolher um pacote preenche todos os seletores de uma vez; ainda dá para trocar um modelo isolado depois. Salvar segue exatamente o fluxo atual.

## 5. Itinerário: Semana de pioneiro / Semana livre
- Botão **"Semana sem visita"** no Itinerário com as opções Semana de pioneiro e Semana livre e a data de início.
- Cria o evento correspondente na Agenda (esses tipos já existem lá), sem congregação, com escopo pessoal.
- Essas semanas aparecem intercaladas na lista do Itinerário com um selo próprio, e podem ser editadas/excluídas ali.

## Detalhes técnicos
- Nova rota `src/routes/_app.modelos-base.tsx` (ou reaproveitar `/modelos`) com `validateSearch` `{ tipo }`; cada editor atual é extraído para um componente (`ProgramTemplatesEditor`, `FieldTemplatesEditor`, etc.) mantendo estado, server functions e handlers sem mudança. Rotas antigas viram `beforeLoad` com `redirect` para a pílula correspondente. Sidebar em `_app.tsx` reduzida a um item.
- Editores carregados com `React.lazy` por pílula, para abrir rápido.
- Pacotes: `src/lib/visit-packages.ts` em localStorage `visita-sc:packages:<userId>` (`{id,name,program,checklist,field,meetingTalk,elder}`), `useSyncExternalStore`. Exportação reutiliza as server functions de export/import já existentes de cada modelo, empacotadas num zip (JSZip) com `package.json` + arquivos de cada modelo; importação chama os imports existentes e regrava os ids.
- Itinerário (`_app.configuracoes.tsx`): seletor de pacote apenas faz `setForm` dos campos `template_id`, `checklist_template_id`, `field_template_id`, `meeting_talk_template_id`, `elder_program_template_id`.
- Semanas: inserção em `circuit_schedule_events` via `offlineInsert` já usado em `_app.cronograma.tsx`, `event_type` `pioneer_week`/`free_week`, `scope: "personal"`, `congregation_ids: []`, data inicial a +6 dias; lista do Itinerário lê esses eventos.
- Testes: `visit-packages.test.ts` (criar, remover modelo ausente, importar remapeando ids). Validar com `bunx tsgo --noEmit`, `bunx vitest run` e conferir no navegador em 393px.
