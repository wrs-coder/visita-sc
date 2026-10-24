# Quatro ajustes nos esboços (rodada econômica)

## 1. Texto destacado legível no modo escuro (todos os acessos)
- Hoje o destaque (marca-texto) mantém fundo claro e herda a letra clara do tema escuro, por isso a letra some.
- Ajuste único no estilo global: no modo escuro e no preto puro, todo texto destacado nos esboços, notas, leitura e tela cheia passa a usar letra escura sobre a cor do destaque (ou cor do destaque um pouco mais suave), garantindo contraste.
- Vale automaticamente para superintendente, anciãos e espaço da esposa, porque todos usam o mesmo estilo de exibição. Nenhum texto salvo é alterado.

## 2. Botão "Sincronizar" no popup de detalhes da tela cheia
- Na tela cheia, o botão de detalhes é aberto sem a função de sincronizar (só no modo esboço ela existe).
- Passar a mesma ação de sincronizar (Consideração de Campo e Esboços da Semana) para o botão de detalhes da tela cheia, nas duas telas cheias (Esboços Pessoais e Dashboard). Desativado quando sem internet, como já acontece.

## 3. Dashboard: "Abrir no modo esboço" abre o esboço certo
- Causa confirmada: ao chegar pelo link, a tela assume sempre a subaba "Consideração de Campo". Se o esboço for de "Esboço" ou "Anotações", ele não é encontrado e a tela fica vazia.
- Correção: antes de abrir, descobrir o tipo do esboço pedido, selecionar a subaba correta, a pasta e o próprio esboço em modo esboço.

## 4. Seleção de vários esboços no celular (pressionar e segurar)
- Pressionar e segurar um esboço (cerca de meio segundo, com leve vibração no app) entra no "modo seleção", como na galeria de fotos.
- No modo seleção: toques simples marcam/desmarcam; aparece a barra já existente com "N selecionados" (mover, recortar, exportar, sincronizar, excluir) e um botão "Cancelar".
- O arrastar e soltar continua funcionando: o arraste só começa se o dedo se mover; segurar parado ativa a seleção.
- A caixinha de seleção atual continua no computador.

## Detalhes técnicos
- `src/styles.css`: regra `.dark mark, .dark .bible-highlight` (incluindo `.dark.oled`) com `color` escuro por token e `background` em tokens; sem hex inline.
- `src/routes/_app.consideracoes-campo.tsx`: passar `onSync`/`syncing` ao `FieldNoteInfoButton` da tela cheia (linha ~2587) reutilizando `handleSyncFromField` e `talkSync`; no bootstrap por `search.noteId`, ler a nota com `listNotes()` e chamar `setActiveType(target.type)` antes de filtrar; long-press em `NoteRow` via timer em `onPointerDown/Up/Move` coexistindo com o sensor do dnd-kit (sensor com `delay`/`tolerance` no toque) e estado `selectionMode`.
- `src/components/dashboard/FieldNoteFullscreenDialog.tsx`: aceitar `onSync`/`syncing` opcionais e repassar.
- Sem mudanças em banco, login, sincronização ou formato dos dados. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
