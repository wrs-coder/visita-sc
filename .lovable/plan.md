
## Estratégia: implementação em 4 etapas

Cada etapa é **independente, testável e não-destrutiva**. Só avançamos para a próxima depois de confirmar que a anterior funciona (sem regressão em exportação, offline, permissões ou nos ajustes recentes).

---

### Etapa 1 — Esqueleto da tela + permissão + i18n
**Objetivo:** colocar a rota no ar, vazia, acessível só pelo superintendente.

- Criar `src/routes/_app.consideracoes-campo.tsx` com `beforeLoad` redirecionando ancião para `/dashboard`
- Adicionar item **"Considerações de campo"** no menu lateral (`src/routes/_app.tsx`), seção **"Semana da visita"**, visível só quando `role === "superintendent"`
- Chaves i18n em PT/EN/ES: `sidebar.fieldConsiderations` + `fieldConsiderations.title`, `.subtitle`
- UI mínima: título + card "em construção"

**Critério:** menu aparece só para super; ancião redireciona; sem erro de build.

---

### Etapa 2 — Gerenciador de notas + persistência local
**Objetivo:** CRUD completo de notas em IndexedDB (com fallback localStorage), sem nada de Bíblia ainda.

- `src/lib/bible-notes-store.ts` — wrapper IndexedDB (store `notes`) com fallback localStorage
- Sidebar interna com lista + botão **"+ Nova nota"** + busca por título
- Formulário: Título, Oração final, Território, Dirigentes auxiliares, Conteúdo (`<textarea>` livre, sem limite), data de criação/atualização
- Botões **Salvar nota**, **Excluir**, indicador "Salvo" (reaproveitar `SavingIndicator`)
- Chaves i18n adicionadas em PT/EN/ES

**Critério:** criar nota, fechar app, reabrir — nota persiste. Funciona em browser, PWA e WebView.

---

### Etapa 3 — Bíblia offline (seed + gerenciador de idiomas)
**Objetivo:** infra de versículos pronta, sem ainda integrar ao texto da nota.

- `src/lib/bible-seed.ts` — Gn 1:1 e Jo 3:16 em PT/EN/ES embutidos no bundle
- `src/lib/bible-refs.ts` — mapas de livros por idioma + builder do regex dinâmico
- Store `bibles` no wrapper IndexedDB, indexado por `{lang, book, chapter, verse}`
- Seed automático na primeira execução
- `BibleManagerDialog.tsx` — modal "Gerenciar idiomas" com status + barra de progresso para PT/EN/ES (download = expande seed local nesta versão)
- Cabeçalho da tela: "Bíblia ativa: <idioma>" + botão **Gerenciar idiomas**

**Critério:** abrir modal, ver 3 idiomas, "baixar" cada um, status atualiza. Sem rede, `getVerse("pt","João",3,16)` retorna texto.

---

### Etapa 4 — Modo Edição × Modo Esboço (integração final)
**Objetivo:** ligar regex + Bíblia ao editor de notas.

- **Modo Edição:** `onChange` roda o regex do idioma ativo → painel superior mostra versículos detectados em tempo real
- **Modo Esboço:** após Salvar (ou ao reabrir), conteúdo vira read-only com citações renderizadas como **links azuis clicáveis**
- `BibleVersePopover.tsx` — popover/modal flutuante que abre ao tocar o link
- Botão **"Editar nota"** volta ao Modo Edição
- Alternância suave de modo sem perder texto

**Critério:** digitar "João 3:16" mostra versículo no topo; salvar → vira link azul; tocar → popover abre. Trocar app para EN reconhece "John 3:16"; ES reconhece "Juan 3:16".

---

## Garantias transversais (em todas as etapas)

- **Zero alteração** em: `_app.modelo-reunioes-discursos.tsx`, `_app.configuracoes.tsx`, `_app.notas.tsx`, `src/lib/offline-*`, `template-io.functions.ts`, qualquer migration, RLS, server function, `client.ts` ou `types.ts`
- **Nenhuma tabela nova no Supabase** — tudo local no dispositivo do super
- Após cada etapa: verificar build, abrir preview, conferir que exportação PDF, fila offline e telas de modelos seguem intactas

## Próximo passo

Começamos pela **Etapa 1** assim que você aprovar este plano faseado. Cada etapa entra em uma mensagem separada para você validar antes de seguir.
