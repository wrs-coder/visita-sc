# Pesquisas Pessoais: pastas temáticas, Modo Zen, versículos clicáveis e busca

## O que já existe hoje (será mantido)
- Pastas próprias da aba Pesquisas (criar, renomear, apagar).
- Busca no título e no conteúdo.
- Abrir uma pesquisa já mostra a tela cheia com exportar (.txt, .md, PDF).
- Tudo fica salvo só no aparelho, separado por código de convite, e entra no backup.

## O que muda

1. **Pastas temáticas**
   - Se ainda não houver nenhuma pasta de pesquisas, aparecem sugestões com um toque: "Qualidades Cristãs", "História Bíblica", "Adoração Matinal". Ela pode criar outras com qualquer nome.
   - Cada pasta mostra quantas pesquisas tem.
   - Na lista, cada pesquisa mostra o nome da pasta e um trecho do texto.

2. **Modo Zen (tela cheia)**
   - "Nova pesquisa" já abre a tela cheia, pronta para escrever.
   - Dois modos no topo: **Ler** e **Editar**.
     - **Editar:** mesma barra de ferramentas dos esboços do superintendente.
     - **Ler:** os versículos digitados (ex.: "Jo 3:16", "Sal. 23:1-3") aparecem sublinhados. Ao tocar, abre o mesmo balão bíblico dos esboços pessoais (texto, destacar, A-/A+, copiar).
   - Pesquisas que já têm texto abrem em **Ler**. Pesquisas novas abrem em **Editar**.
   - Botões rápidos na barra para inserir:
     - **Referência:** caixa para digitar o versículo; entra como texto destacado e fica clicável.
     - **Nota explicativa:** bloco destacado com o título "Nota".
     - **Link interno:** escolhe outra pesquisa ou anotação dela. No modo Ler, o toque abre essa outra pesquisa.
   - Botão **Salvar**: grava na hora e mostra "Salvo". O salvamento automático continua.
   - Botão **Exportar**: .txt, .md e PDF, como já existe hoje.

3. **Busca rápida**
   - O campo de busca fica fixo no topo da lista de pesquisas, com um botão "x" para limpar.
   - A busca mostra quantas pesquisas foram encontradas.
   - A palavra procurada aparece destacada no título e no trecho.

## O que não muda
- "Semana da Visita", "Anotações" e "Leitura da Bíblia" ficam como estão.
- Nenhuma alteração no servidor ou no banco de dados.

## Detalhes técnicos
- `GuestWorkspace.tsx`:
  - Sugestões de pastas quando `kindFolders` (kind "research") estiver vazio.
  - Contagem por pasta, trecho com `htmlToPlain` e destaque da busca.
  - Criar uma pesquisa abre o `FocusEditor` com `mode="edit"`.
- `FocusEditor`:
  - Estado `mode: "read" | "edit"`.
  - **Ler** renderiza `RichOutlineContent` (de `rich-content.tsx`), o mesmo usado nos esboços. Ele já reconhece as referências e abre o `BibleVersePopover`.
  - **Editar** mantém o `RichNoteEditor`.
  - Barra extra com Referência / Nota / Link interno, que insere HTML no corpo:
    - nota: `<blockquote><p><strong>Nota:</strong> …</p></blockquote>`
    - link interno: `<a href="#ws:<id>">`
  - O modo Ler intercepta o clique em `#ws:` e abre o item com esse id.
  - Salvar chama `flush()`, a gravação imediata que já existe.
- Confirmar que `sanitizeNoteHtml` mantém `href="#ws:..."`. Se não mantiver, liberar só esse prefixo.
- Dados continuam em `WsData.items` (kind "research") e `folders` (kind "research"). Sem mudança no formato.
- Teste novo: a busca encontra pelo título e pelo conteúdo, e o link interno `#ws:` sobrevive à limpeza do texto.
