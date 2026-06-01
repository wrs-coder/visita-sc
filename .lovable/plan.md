## Objetivo

Na aba **Esboços Pessoais**:

1. Sincronizar automaticamente notas e pastas das duas subabas (Esboços e Consideração de Campo), preservando a pasta por subaba entre dispositivos.
2. Permitir seleção múltipla para mover, recortar, excluir, exportar, importar e enviar para nuvem; permitir mover entre subabas; e mostrar o ícone "baixar da nuvem" também na subaba Consideração de Campo.

---

## Parte 01 — Sincronização automática das duas subabas

### Comportamento

- Ao **salvar** uma nota ou pasta em qualquer subaba, dispara sync automático (igual ao que já existe em Esboços).
- A nota é gravada na nuvem **com o tipo da subaba** (`outline` ou `field_consideration`) e o **caminho da pasta** dentro daquela subaba.
- Ao logar em outro dispositivo, a nota aparece na mesma subaba e na mesma pasta. Se a pasta não existir naquele dispositivo, ela é **criada automaticamente** na raiz daquela subaba (já é o que `ensureFolderPath` faz para outlines; vamos estender para field_consideration).
- O botão "Enviar para nuvem" (CloudUpload) continua presente nas duas subabas como **reforço manual** para casos offline/erro.
- A subaba Consideração de Campo ganha também o botão "Baixar da nuvem" (CloudDownload), filtrando apenas notas do tipo `field_consideration`.

### Mudanças técnicas

**Banco (`personal_outlines`)**: reaproveitar a tabela. Adicionar marcador de tipo em `content_json.note_type` (`"outline"` | `"field_consideration"`). Pastas continuam marcadas com `content_json.kind = "folder"` e ganham `content_json.folder_type` para distinguir as duas árvores. Sem migração de schema — apenas convenção dentro do JSONB existente.

**`src/hooks/use-outlines-sync.ts`** → renomear conceitualmente para sincronizar ambos os tipos:
- Remover o filtro `isOutline` e processar tanto `outline` quanto `field_consideration`.
- Em `folderPath`, separar árvore por `type` (já temos `listFolders(type)`); usar `folder_type` no payload para roteamento na volta.
- Em `ensureFolderPath`, aceitar `type` para criar a pasta na árvore correta.
- Manter o pipeline LWW (last-write-wins) por `updated_at` que já existe.

**`src/lib/personal-outlines.functions.ts`**:
- `cloudOutlineSchema` e `cloudFolderSchema` ganham `note_type`/`folder_type` opcional (default `"outline"` para compatibilidade com dados antigos).
- `listCloudOutlineTree` continua retornando tudo; o hook filtra/roteia por tipo.

**Disparo automático ao salvar em Consideração de Campo**:
- Em `src/routes/_app.consideracoes-campo.tsx`, a função `syncOutlinesIfOnline` hoje só dispara para `activeType === "outline"`. Remover essa restrição para que salvar/excluir em qualquer subaba dispare o sync.

**Compatibilidade com dados antigos**: linhas sem `note_type` no `content_json` continuam sendo tratadas como `outline` (comportamento atual), evitando bagunçar usuários existentes.

---

## Parte 02 — Seleção múltipla, mover entre subabas e baixar da nuvem

### UI de seleção múltipla

Em `src/routes/_app.consideracoes-campo.tsx`, na lista de notas dentro de cada pasta:

- Adicionar estado `selectedIds: Set<string>` por subaba.
- Cada item da lista ganha um **checkbox** à esquerda (aparece em modo seleção; o toggle entra ao primeiro long-press ou ao clicar num novo botão "Selecionar").
- Quando há ≥1 selecionada, aparece uma **barra de ações fixa** no topo da lista com botões: Mover, Recortar, Excluir, Exportar, Enviar para nuvem. Importar permanece no header global (não depende de seleção).

### Ações em lote

- **Excluir**: itera `removeNote` para cada id, atualiza estado, dispara sync uma vez no final.
- **Exportar**: gera um único JSON `ExportPayload` agregando as notas (reaproveita `exportNoteJSON` adaptado para múltiplos itens, ou empacota como um pseudo-folder export).
- **Enviar para nuvem**: itera `handlePushNoteById` em série, com toast resumo no fim.
- **Recortar**: guarda os ids em `clipboardNoteIds: string[]` (substitui o atual `clipboardNoteId` singular). Ao "Colar" numa pasta, move todos.
- **Mover**: abre o diálogo de seleção de destino, que agora lista pastas das **duas** subabas (com cabeçalho por subaba). Confirmação aplica `folderId` novo e, se a subaba destino for diferente, também atualiza `type`.

### Mover entre subabas

- O diálogo de mover/recortar mostra duas seções: "Esboços" e "Consideração de Campo", cada uma com sua árvore de pastas + opção "Raiz".
- Ao mover uma nota para a outra subaba:
  - `type` é trocado para o tipo da subaba destino.
  - `folderId` aponta para a pasta destino (ou `null` para raiz).
  - `title` e `content` são preservados; campos extras (`prayer`, `territory`, `assistants`, `description`) **permanecem no objeto** (não são apagados — ficam invisíveis na nova subaba mas reaparecem se a nota voltar), evitando perda de dados.
  - `dirty = true` para sincronizar.
- Após mover, a nota some da lista atual (porque o filtro por `activeType` deixa de incluí-la) e aparece na outra subaba ao trocar.

### Botão "Baixar da nuvem" na subaba Consideração de Campo

- Hoje só existe em Esboços (`handleCloudOpen` + diálogo). Generalizar:
  - Mover o diálogo para um componente compartilhado dentro do mesmo arquivo, parametrizado por `noteType`.
  - Em `refreshCloudList`, filtrar `cloudList` por `note_type` correspondente à subaba ativa (linhas antigas sem marcador entram em Esboços por compatibilidade).
  - Renderizar o ícone `CloudDownload` no header das duas subabas, ao lado do ícone de importar.

---

## Riscos e mitigações

- **Dados antigos sem `note_type`**: tratados como `outline` (preserva o estado atual dos usuários existentes).
- **Sync simultâneo das duas subabas**: o hook já é idempotente (LWW por `updated_at`); só processar uma única chamada por evento de save evita corrida.
- **Mover em lote entre subabas com pastas inexistentes**: `ensureFolderPath` cria a pasta destino se preciso; sem isso, cai na raiz da subaba destino.
- **Botão "Enviar para nuvem" manual**: mantido como solicitado; vira redundância segura (não duplica linhas porque o push usa `cloud_id` quando existe).

---

## Arquivos a editar

- `src/lib/bible-notes-store.ts` — nenhuma mudança de schema; apenas helpers se necessário (ex.: tipar `note_type`).
- `src/lib/personal-outlines.functions.ts` — schemas Zod aceitam `note_type`/`folder_type` opcionais.
- `src/hooks/use-outlines-sync.ts` — processa ambos os tipos; roteia pasta por `type`.
- `src/routes/_app.consideracoes-campo.tsx` — disparar sync em ambas as subabas; UI de seleção múltipla; barra de ações em lote; diálogo de mover entre subabas; botão CloudDownload na subaba Consideração de Campo.
- `src/i18n/locales/{pt,en,es}.json` — chaves novas para os botões em lote e títulos do diálogo cross-subaba.

Sem migração SQL e sem mudança nas RLS (continuamos em `personal_outlines` escopada por `user_id`).
