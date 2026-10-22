# Pastas exclusivas de cada aba

## O que ela vai ver
- Cada aba passa a ter suas próprias pastas:
  - Anotações
  - Leitura da Bíblia (Anotações de leitura)
  - Pesquisas Pessoais
- Uma pasta criada numa aba aparece somente nessa aba.
- A gaveta de configurações mostra e cria só as pastas da aba aberta. O título fica, por exemplo, "Pastas · Pesquisas Pessoais".
- Na tela cheia, o seletor "Pasta" lista só as pastas da mesma aba.
- Ao trocar de aba, o filtro de pasta volta para "Todas", para não ficar preso numa pasta de outra aba.

## Pastas que já existem
- As pastas criadas antes, que hoje aparecem em todas as abas, serão colocadas automaticamente numa aba só:
  - vão para a aba onde estão os itens guardados nelas;
  - uma pasta vazia vai para "Anotações".
- Se uma pasta antiga tiver itens em mais de uma aba, ela é copiada para cada aba, com o mesmo nome. Nenhum item muda de lugar ou se perde.
- Isso acontece uma vez, no próprio aparelho. Também acontece ao restaurar um backup antigo.

## O que não muda
- As anotações em si, o backup, a "Semana da Visita" e o banco de dados ficam como estão.

## Detalhes técnicos
- `guest-workspace-store.ts`: em `sanitizeWs`, toda pasta sem `kind` ganha um tipo, deduzido pelos itens que apontam para ela.
  - Se houver itens de vários tipos, a pasta é duplicada por tipo, com um id novo derivado do original, e o `folderId` desses itens é remapeado para a cópia.
  - Uma pasta sem itens fica como `"note"`.
  - Depois disso, `kind` passa a ser sempre preenchido.
- `GuestWorkspace.tsx`:
  - `kindFolders` filtra por `f.kind === kind`, sem aceitar pastas sem tipo.
  - `setFolder(null)` ao trocar de seção ou subaba.
  - `WorkspaceSheet` recebe `kind`, lista só as pastas desse tipo e cria a pasta nova com esse `kind`.
  - O seletor de pasta do `FocusEditor` usa o mesmo filtro estrito.
- Teste: uma pasta antiga com itens de "note" e "research" vira duas pastas, cada item fica na pasta do seu tipo, e uma pasta vazia vira "note".
