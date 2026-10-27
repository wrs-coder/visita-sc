# Esboços Pessoais: modo foco para escrever e ler

## É seguro?
Sim. As três mudanças afetam só a aparência e a posição dos botões. Continuam iguais:
- o texto salvo e a sincronização com a nuvem
- o rascunho automático e o aviso de rascunho
- o cronômetro e o tempo por tópico
- os anexos e a exportação em Word e PDF

O botão 📖 já existe no acesso da esposa e já foi testado lá. A barra azul do topo só some enquanto um esboço está aberto. Quando você volta para a lista, ela reaparece com a congregação, o Wi-Fi, a sincronização, a lixeira e o botão de sair.

## Como fica a tela (celular)

Modo edição: a barra de ferramentas começa fechada.
```text
+-------------------------------------+
| < Esboços  [Editar|Esboço]  ⋯  [💾] |  <- substitui a barra azul
+-------------------------------------+
| ▸ Detalhes (oração, território...)  |
| [Aa Ferramentas ▾]                  |
|                                     |
|  Texto do esboço ocupando quase     |
|  toda a altura da tela...           |
|                                     |
|                                 (📖3)|  <- arrastável, encaixa na borda
|                                     |
+-------------------------------------+
```

Quando você toca em "⋯":
```text
                 +--------------------+
                 | ⤓ Exportar PDF     |
                 | W  Word (.docx)    |
                 | ☁  Nuvem           |
                 | ⛶  Tela cheia      |
                 | ─────────────────  |
                 | 🗑 Excluir  (vermelho)|
                 +--------------------+
```

Quando você toca em 📖, o painel abre por baixo:
```text
+-------------------------------------+
| Versículos detectados        [ˇ]    |
| [Jo 3:16] [Sl 23:1] [Mt 5:9]        |
| Consultas recentes                  |
| [Is 41:10] [Rm 8:28]                |
+-------------------------------------+
```
Quando você toca numa referência, o painel fecha e o versículo abre na tela.

Modo esboço (leitura):
```text
+-------------------------------------+
| < Esboços  [Editar|Esboço]  ⋯       |
+-------------------------------------+
| ⏱ 00:12:30  ▶  ⏸        [tópicos]   |  <- cronômetro como hoje
|  Texto em leitura...                |
+-------------------------------------+
```
O botão "Salvar" só aparece no modo edição, como hoje. No modo esboço, o "⋯" não mostra a opção Excluir na mesma linha, para evitar toques acidentais.

## O que muda
1. **Botão 📖 flutuante (só no modo edição).** O quadro fixo "Versículos detectados" e as consultas recentes saem do meio da tela. Eles passam para o botão 📖, que mostra o número de versículos encontrados. A posição do botão fica guardada no aparelho.
2. **Barra de ferramentas recolhível.** Ela começa fechada. O botão "[Aa] Ferramentas" abre e fecha a barra, e o aparelho guarda a sua escolha.
3. **Linha única no topo.** Ela traz "< Esboços", a escolha Editar/Esboço, o menu "⋯" (Exportar, Word, Nuvem, Tela cheia, Excluir) e "Salvar". Ela fica presa no topo e ocupa o lugar da barra azul do app enquanto um esboço está aberto no celular. Com isso, a barra de botões do rodapé deixa de existir.
   - Botão "voltar": "< Esboços" já faz esse papel. Por isso não incluí um "voltar" separado, que seria duplicado.

## Outras sugestões (incluídas no plano)
4. **Detalhes recolhidos.** No modo edição, os campos Oração, Território e Ajudantes ficam recolhidos em "▸ Detalhes" por padrão. A tela já tem esse recurso de recolher. O plano só faz a tela abrir com ele fechado e guarda a sua escolha.
5. **Avisos menores.** Os avisos de rascunho e de soma de tempo passam a ocupar uma linha discreta. Eles continuam sumindo quando o teclado abre.
6. **Moldura menor no celular.** O cartão em volta do texto perde a borda e as margens grandes no celular. Assim o texto ganha a largura toda da tela.
7. **Mais altura para o texto.** Com a barra azul e o rodapé fora da tela, o espaço para escrever cresce cerca de 7rem, mais ou menos 5 linhas.

No computador, o layout continua como hoje, com a barra lateral e a lista ao lado. Só o botão 📖 e a barra de ferramentas recolhível valem também para o computador.

## Detalhes técnicos
- `FloatingVersePanel` (guest-workspace) ganha props genéricas: uma `storageKey` para a posição e um `renderPick` opcional. A tela de esboços passa `detected`, `activeBible` e `onInsertBibleText`, e usa `storageKey="outlines.versePanel.pos"`. O comportamento no acesso da esposa não muda.
- `RichNoteEditor` usa a prop `collapsibleToolbarKey="outlines.toolbarOpen"`, que já existe.
- Novo módulo pequeno `src/lib/focus-chrome.ts` (useSyncExternalStore): `setFocusChrome(bool)` e `useFocusChrome()`. `_app.tsx` aplica `hidden` no header mobile quando ele está ativo (só classe, sem desmontar, para preservar Sheet/estado). `_app.consideracoes-campo.tsx` liga quando `draft && !showLibrary` e desliga no unmount ou ao voltar.
- `NoteEditor`: a action bar do rodapé é substituída por uma topbar sticky (`top-0`, `safe-top`) com DropdownMenu. Os mesmos handlers continuam: onSave, onDelete, onExport, onExportDocx, onCloud, onFullscreen. O bloco "detected" é removido do fluxo.
- `metaCollapsed` passa a ter default `true` no modo edição, persistido em localStorage. O cálculo de `minH`/`maxH` desconta a nova topbar (cerca de 3rem) em vez do header e do rodapé.
- i18n pt/en/es para os novos rótulos ("Mais ações", "Detalhes").
- Uma regra no AGENTS.md: o header mobile pode ser ocultado por telas de foco via `focus-chrome`, sem desmontar.
- Validação: `bunx tsgo --noEmit`, `bunx vitest run` e captura Playwright em 393x733 nos modos edição e esboço.
