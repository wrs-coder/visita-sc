# Barra estilo Samsung Notes (botões diretos) + Notas Privadas sem alça

## 1) Barra de ferramentas: cada botão abre a sua própria faixa

Hoje o botão **Aa** junta tudo numa faixa só: estilo, tamanho, fonte, cores e marca-texto. A mudança separa cada coisa em um botão próprio, como no Samsung Notes. Cada botão abre uma faixa baixa, logo acima da barra, sem esconder o texto e sem fechar o teclado.

```text
┌─────────────────────────────┐
│ ← 📖 ✏️ ⤢ ⋯ 💾               │
│                             │
│  Texto do esboço...|        │
│                             │
├─────────────────────────────┤
│ Cor da fonte            ✕   │  <- faixa aberta pelo "T"
│ ● ● ● ● ● ● ● ● ● ● ● ●  →  │     (arrasta para o lado,
│ ● ● ● ● ● ● ● ● ● ● ● ●     │      dezenas de cores)
├─────────────────────────────┤
│ ↶  Aa  12▾  B  T̲  [T]  ≡  ⋯ │  <- barra fixa (personalizável)
├─────────────────────────────┤
│        T E C L A D O        │
└─────────────────────────────┘
```

O que cada botão abre:
- **Aa (estilo)**: Texto normal · Título (H2) · Subtítulo (H3) · Citação. O estilo em uso aparece marcado.
- **12▾ (tamanho)**: uma régua de tamanhos (12, 14, 16, 18, 20, 24…). O número no botão mostra o tamanho atual.
- **T com faixa colorida (cor da fonte)**: "Cor da fonte", com cerca de 30 cores em grade e "Automática". A faixa embaixo do T mostra a cor em uso.
- **T dentro de um quadrado (cor do fundo/destaque)**: "Cor do fundo", com cerca de 30 cores claras e "Sem destaque".
- **Fonte**: lista das fontes que o app já tem.
- **Alinhamento / Listas / Recuo**: cada um abre só as suas opções.
- **⋯**: o restante (Localizar, contador, personalizar barra, ocultar barra).

Como funciona:
- Uma faixa por vez: abrir outra fecha a anterior. Tocar no mesmo botão ou no ✕ também fecha.
- O cursor e a seleção continuam no texto, e o teclado continua aberto.
- **"Editar barra de ferramentas" continua.** Cada pessoa escolhe quais desses botões ficam na barra fixa, e em que ordem. Os botões novos (Estilo, Tamanho, Cor da fonte, Cor do fundo, Fonte) entram na lista de escolha. Desfazer e ⋯ ficam sempre na barra.
- Quem já personalizou a barra mantém o que escolheu. Quem nunca mexeu passa a ver, de início: ↶ Aa 12▾ B T̲ [T] ≡ ⋯.

## 2) Notas Privadas: tirar a alça lateral

Concordo: a alça e o botão da categoria fazem a mesma coisa. Fica só o botão com o nome da categoria, no topo da lista. O painel com as 6 categorias e os contadores continua igual.

```text
┌─────────────────────────────┐
│ Notas Privadas    + Novo  ⋯ │
│ [ Congregação ▾ ]           │
│ 🗂 Pastoreio (4)   ▾        │  <- toca aqui: abre o painel
│ ┌─────────────────────────┐ │
│ │ nota...                 │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

O painel continua abrindo pela direita e fecha ao escolher uma categoria, ao tocar fora ou ao arrastar.


## 3) "Mais ferramentas" (⋯) em páginas de duas linhas

Cada grupo de ferramentas ocupa no máximo duas linhas. Para ver o próximo grupo, arraste para o lado, como as páginas de ícones do celular. Bolinhas embaixo mostram em qual página você está.

```text
├─────────────────────────────┤
│ Inserir                     │
│ [Tópico] [Tempo] [Link] [—] │
│ [Tabela] [Imagem]           │
│            ● ○ ○ ○          │  <- arraste ← para "Parágrafo"
├─────────────────────────────┤
│ ↶  Aa  12▾  B  T̲  [T]  ≡  ⋯ │
```

Páginas: Inserir · Parágrafo (recuos, espaçamento, alinhamento) · Ferramentas (Localizar, contador) · Barra (Editar barra, Ocultar barra). A altura é sempre a mesma, então o texto continua visível.

## 4) Área de escrita livre em Anotações e Pesquisas (estilo Samsung Notes)

Hoje a área de escrita começa pequena e só cresce conforme você digita. Ela passa a ocupar toda a tela disponível, como uma folha em branco. Tocar em qualquer espaço vazio abaixo do texto coloca o cursor no fim e abre o teclado. Tocar no meio do texto continua posicionando o cursor naquele ponto.

```text
┌─────────────────────────────┐
│ ←        Pesquisa     ⋯  💾 │
│ Título                      │
│ Texto digitado...|          │
│                             │
│   (toque em qualquer lugar  │
│    daqui para escrever)     │
│                             │
├─────────────────────────────┤
│ ↶  Aa  12▾  B  T̲  [T]  ≡  ⋯ │
└─────────────────────────────┘
```

Observação: não é possível começar uma linha "solta" no meio da tela, porque o texto precisa continuar em ordem para salvar, exportar para o Word e reconhecer os textos bíblicos. O toque no vazio sempre leva o cursor para o fim do texto, como no Samsung Notes no modo de digitação.

Técnico: no `GuestWorkspace` (Anotações e Pesquisas), o editor recebe `flex-1` com altura mínima igual à área visível (`use-stable-viewport-height`). Um toque no espaço vazio chama `editor.commands.focus('end')`. O ⋯ passa a ter `ScrollRow` com scroll-snap por página, grade de 2 linhas e indicador de bolinhas. O formato salvo das notas não muda.

## O que não muda
- As notas salvas, os esboços, a importação/exportação Word, a detecção de textos bíblicos e o balão bíblico.
- O "+ Novo" com as 6 categorias e os links diretos para cada categoria.

## Detalhes técnicos
- `note-toolbar-prefs.ts`: novos ids `style`, `size`, `fontColor`, `highlight`, `font`, `align`, `lists`. As preferências antigas são migradas sem perder a ordem; ids desconhecidos são ignorados.
- `RichNoteToolbar.tsx`: troca a faixa única do "Aa" por um estado `openTray` com um valor por ferramenta. Cada faixa usa `trayMaxHeight` e o mesmo `onMouseDown preventDefault` para não tirar o foco do editor. Usa as paletas de cor que já existem (ampliadas para cerca de 30 cores).
- Os ícones de cor mostram a cor atual a partir de `editor.getAttributes('textStyle'/'highlight')`.
- `_app.notas.tsx`: remove a alça. `EdgePanel` passa a ser aberto só de forma controlada (prop `showHandle={false}`, ou remoção da alça).
- Atualizar textos pt/en/es, a Ajuda (`help-content.ts`), `src/components/notes/AGENTS.md` e `roadmap.md`.
- Testes: migração das preferências da barra e "uma faixa por vez"; rodar vitest e typecheck. Teste rápido no celular simulado.
