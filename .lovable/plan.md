# Área da esposa — Anotações limpas, Pontos altos em pílula e sugestões

Vale para as abas **Anotações** e **Estudo Pessoal** (Leitura da Bíblia e Pesquisas Pessoais), porque todas abrem o mesmo editor de anotação. Nenhum texto salvo muda e o backup continua igual.

## Antes de tudo: para que servem "Referência", "Nota" e "Link interno"

- **Referência**: pede um texto (ex.: Jo 3:16) e coloca no fim da anotação como uma citação destacada. Isso repete o que já acontece sozinho, porque os versículos digitados no texto já são reconhecidos.
- **Nota**: pede uma frase e coloca no fim como um quadro de observação. Funciona, mas sempre vai para o final, não para onde está o cursor, e por isso confunde.
- **Link interno**: cria um atalho para abrir outra anotação ou pesquisa sua (ex.: "ver também: Fé"). É o único dos três que faz algo que o editor não faz.

**Proposta:** tirar os três botões da tela. "Referência" sai (é repetido). "Nota" e "Link interno" vão para o menu "⋯" com nomes claros: **"Inserir quadro de observação"** e **"Ligar a outra anotação"**.

## 1. Editor de anotação (limpo)

```text
┌─────────────────────────────────┐
│ ‹  [📁 Sem pasta ▾]  👁|✎  💾 ⋯ │  ← uma só linha
├─────────────────────────────────┤
│ Título                          │
│                                 │
│ Comece a escrever…              │
│                                 │
│                                 │
│     (área grande de escrita,    │
│      mesma altura do esboço     │
│      do superintendente)        │
│                                 │
│                                 │
│                       812/4000  │
│ ─────────────────────────────── │
│ [Aa ▸ Ferramentas]              │  ← recolhida ao abrir
│                          ( 📖2 )│  ← botão flutuante
└─────────────────────────────────┘
```

- **Linha de cima**: voltar, escolher a pasta (em formato de pílula com menu), Ler/Editar, Salvar e o menu "⋯". O menu "⋯" junta Exportar (txt, md, PDF, Word), Inserir quadro de observação, Ligar a outra anotação e Excluir (com a pergunta de confirmação de hoje).
- **Barra de ferramentas**: começa **recolhida** e mostra só "Aa Ferramentas". Um toque abre a barra completa. A escolha fica salva neste aparelho.
- **Área de escrita**: grande como a edição do esboço, com contador **n/4000** discreto. Ao passar de 4000 o contador fica laranja e aparece um aviso. As anotações antigas maiores que isso não são cortadas.
- **Versículos detectados + Consultas recentes**: saem do rodapé e viram um **botão flutuante 📖** com o número de versículos encontrados. Um toque abre um painel por baixo, que pode ser recolhido.

```text
│                    ( 📖 2 )  ← arrastar move    │
│ ┌─ Versículos ─────────── ˅ ─┐                 │
│ │ [João 3:16] [Sl 23:1]       │                 │
│ │ Recentes: [Rom 8:28] …      │                 │
│ └─────────────────────────────┘                 │
```

- **O botão pode ser arrastado** para qualquer canto da tela. Ao soltar, ele vai para a borda mais próxima, como os balões do Messenger e o painel lateral do One UI. A posição fica salva neste aparelho.

## 2. Leitura da Bíblia: Pontos altos como pílula

```text
┌─────────────────────────────────┐
│ [Anotações de leitura][Pontos altos·5] │
├─────────────────────────────────┤
│  (lista da pílula escolhida)    │
└─────────────────────────────────┘
```

- O balão flutuante sai da tela. "Anotações de leitura" e "Pontos altos" viram duas pílulas lado a lado.
- A pílula Pontos altos mostra a lista na própria tela, com o botão "+ Novo ponto alto". Tocar em um item abre o mesmo painel de hoje para editar.
- Dentro do leitor de capítulo, o botão "Ponto alto" continua igual.

## 3. Outras sugestões (para você aprovar uma a uma)

1. **Anotações / Pesquisas**: pastas como pílulas com rolagem para o lado. Renomear, Word e Apagar da pasta vão para um "⋯" ao lado da pílula ativa.
2. **Lista de anotações**: busca recolhida em uma lupa, como já fizemos em Notas privadas. Cada item mostra a data no padrão "há 2 dias".
3. **Leitura da Bíblia**: o card de progresso fica fixo no topo e mostra só "Continuar · Gn 12". A lista de livros começa recolhida.
4. **Pesquisas pessoais**: as sugestões de tema aparecem como pílulas tracejadas ("+ Fé", "+ Oração"), só enquanto não houver pastas.
5. **Pastas e configurações**: dividir em grupos no estilo do iOS (Aparência · Pastas · Bíblia · Backup), com o backup em destaque e a data do último backup.

## Detalhes técnicos

- Arquivos: `GuestWorkspace.tsx` (FocusEditor, cabeçalho, menu "⋯", contador), `BibleReadingTab.tsx` (pílulas, lista de pontos altos usando `HighlightsDrawer` para editar), novo `FloatingVersePanel.tsx` (arrastar por eventos de toque, preso às bordas da área visível, posição em localStorage `guestWs.versePanel.pos`).
- O `RichNoteEditor`/`RichNoteToolbar` ganha uma opção para recolher a barra (desligada por padrão, ligada só aqui), com o estado em localStorage `guestWs.toolbarOpen`. O esboço do superintendente não muda.
- A altura do editor usa `use-stable-viewport-height`, igual ao esboço. O contador vem do texto puro (`htmlToPlain`). O limite de 4000 é só um aviso.
- Refs/notas já inseridas continuam aparecendo na leitura (`refHtml`/`noteBlockHtml` não mudam).
- Os textos novos entram em pt/en/es. Depois: `bunx tsgo --noEmit` e `bunx vitest run`, e um teste para o limite do contador (4000).
- Os itens da seção 3 só são feitos se você aprovar.
