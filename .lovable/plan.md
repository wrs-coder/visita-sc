## Missão 01 — Modo edição imersivo (Esboços pessoais)

Quando o usuário entra no "modo edição" **e** minimiza tanto o bloco de informações (dia→dirigentes auxiliares) quanto o de identificação (título→descrição), a área de edição entra em **layout imersivo**:

**Arquivo:** `src/routes/_app.consideracoes-campo.tsx`

1. Detectar estado "imersivo": `mode === "edit" && infoCollapsed && titleCollapsed` (usar os mesmos flags de colapso já existentes).
2. Quando imersivo:
   - O container do editor recebe altura calculada para preencher a viewport (`min-h-[calc(100dvh-...)]`), permitindo ~2000 caracteres visíveis antes do scroll interno do `Conteúdo`.
   - "Versículos detectados" aparece logo abaixo, também expandido.
   - **Cronômetro abaixo da toolbar é ocultado** (`OutlineTimer` inline removido nesse modo; o do topo da página permanece).
   - Aparece um botão "Mostrar campos" (ícone `ChevronsUpDown`) que reabre os blocos minimizados.
   - Botões **Salvar / Excluir / Enviar p/ nuvem / Exportar** permanecem visíveis numa barra de ações fixa.
3. Scroll vertical preservado no editor e na página.

**Toolbar premium em 2 linhas (`src/components/notes/RichNoteToolbar.tsx`):**

Reorganizar em grupos compactos com **dropdown "split-button"** (clique no ícone principal → menu vertical com as variantes):
- **Linha 1:** Formatação de texto (B/I/U/S — dropdown), Tamanho/cor (dropdown), Alinhamento (dropdown), Lista (dropdown ul/ol/check).
- **Linha 2:** Inserir (link, imagem, tabela — dropdown), Estrutura (heading, quote, divider — dropdown), Ações (undo/redo), Limpar.

Usa `DropdownMenu` do shadcn; cada grupo expõe um único botão visível com seta. Otimizado para toque (botões ~36px, gap reduzido). Sem perder nenhuma funcionalidade atual.

---

## Missão 02 — Download persistente (1x por dia)

**Problema atual:** ao voltar de outro app, o warm-up roda de novo porque a sessão de aba (`sessionStorage`) é zerada. Já existe `LAST_WARMUP_KEY` em `localStorage`, mas a janela é 24h *e* depende de `warmupFresh()` ser chamado.

**Arquivo:** `src/hooks/use-offline-warmup.ts`

Alterar a regra de pulo para "1x por dia natural por congregação":

1. Trocar `WARMUP_FRESH_TTL_MS` por uma checagem de **data local** (`YYYY-MM-DD`): se `LAST_WARMUP_KEY.at` é do mesmo dia (timezone do dispositivo) **e** mesma `congId`, pular completamente — não baixar, não recarregar, mesmo se `sessionStorage` foi limpo.
2. Marcar `markWarmed(user.id)` imediatamente nesse caminho (já feito).
3. Manter triggers manuais inalterados: **botão Sincronizar** e **ativar Modo Offline** continuam forçando o warm-up (eles não passam por `useOfflineWarmup`, chamam `prefetchAllForOffline` diretamente).
4. Garantir que o app **carregue dados do cache local** mesmo sem warm-up: o React Query + `query-persister` já hidratam do `localStorage`; nenhuma mudança necessária ali.

**Resultado:** primeira abertura do dia → baixa tudo e persiste. Saídas/retornos no mesmo dia → zero requests automáticos, UI usa cache. No dia seguinte → 1 warm-up novo. Sincronização manual sempre disponível.

---

## Verificação

- `bunx tsc --noEmit` limpo.
- Smoke manual: abrir esboço → editar → minimizar blocos → editor ocupa tela; reabrir blocos pelo botão; toolbar em 2 linhas com dropdowns funcionando; cronômetro inline some no imersivo mas o do topo continua.
- Warm-up: 2ª abertura no mesmo dia não dispara network (verificar console `[offline-warmup]`).

Sem mudanças em schema, backend ou lógica de negócio fora do escopo descrito. Tokens visuais e engine de PDF respeitados.
