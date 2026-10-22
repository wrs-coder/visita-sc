# Esboços pessoais: rodada visual 2 (pílulas, detalhes, leitura pura, Modo Foco de verdade)

Só aparência e caminho na tela. Nada muda em salvamento, sincronização, banco, formato dos esboços, Bíblia, login, PIN ou biometria.

## Por que você não viu diferença nos itens 1 e 5
- **Modo Foco:** hoje a lista some quando você abre um esboço, mas só no celular. O título da página, as abas de tipo, os 6 campos da Consideração, a barra de edição e o cronômetro continuam aparecendo em cima do texto. Por isso a tela parece quase igual.
- **Leitura pura:** o modo esboço continua com moldura, borda e altura limitada (uma caixa dentro da página). A "folha impressa" não foi feita.

## 1. Pastas em pílulas (arrastar e soltar continua)
- Acima da lista entra uma fileira de pílulas que você desliza para o lado: "Todos", depois cada pasta principal.
- Tocar numa pílula mostra só os esboços daquela pasta. A árvore de pastas atual fica num botão "Ver pastas", recolhível, e continua aceitando arrastar e soltar.
- As pílulas também aceitam um esboço solto em cima delas para movê-lo para a pasta. As regras de mover continuam as mesmas.

## 2. "Editar detalhes" e botão Sincronizar no balão
- No modo esboço e na tela cheia, os 6 campos (Data, Período, Título, Oração, Território, Ajudantes) não aparecem mais acima do texto. Fica só o botão de informação.
- No modo de edição, os campos ficam dentro de "Editar detalhes", recolhido. Um toque abre e mostra os mesmos campos de hoje. Ao criar um esboço novo, ele já abre aberto.
- O balão de informações ganha um pequeno botão "Sincronizar". Ele usa a mesma sincronização do botão da lista e mostra um aviso de "Sincronizado" ou de erro. Sem internet, ele aparece desativado.

## 3. Modo de leitura "púlpito"
- Sem caixa nem borda: o texto ocupa a tela como uma folha, com fundo do tema (claro, escuro ou preto puro).
- Letra um pouco maior, linhas mais espaçadas e largura confortável no computador. A- / A+ fica numa barra fina no topo, junto com o botão de informação.
- Versículos com um realce suave da cor principal.
- Cronômetro numa faixa fina no topo, que você pode recolher. Ele continua contando e mostrando os avisos de sempre.
- Vale para o modo esboço e para a tela cheia do painel.

## 4. Modo Foco de verdade
- Biblioteca: busca, pílulas e cartões (título, data e prévia de uma linha).
- Ao tocar num esboço, ele ocupa a tela inteira. O título da página, as abas de tipo e a lista ficam escondidos. No topo fica só "← Esboços", o título, o botão de informação e Ler/Editar.
- No computador e no tablet: a lista fica numa coluna estreita e o esboço do lado. Um botão "Expandir" esconde a coluna para usar a tela toda.
- Ao voltar, a busca, a pílula escolhida e a posição da lista continuam iguais.

## Ordem segura
```text
Rodada A: itens 2 e 3 (detalhes e leitura)  ->  Rodada B: item 4 (Foco)  ->  Rodada C: item 1 (pílulas)
```
As pílulas ficam por último porque envolvem o arrastar e soltar.

## Verificação
- Verificação de código e todos os testes a cada rodada. Testes novos: o filtro das pílulas mostra só os esboços da pasta escolhida, e mover para uma pílula usa a mesma regra de hoje.
- Conferir no navegador com sua conta, em 393px e em 1280px: abrir, voltar, editar e salvar, abrir os detalhes, sincronizar pelo balão, usar a tela cheia com o cronômetro, abrir um versículo, arrastar um esboço para uma pasta e para uma pílula.

## Detalhes técnicos
- `_app.consideracoes-campo.tsx`: estado de apresentação `focusMode` (`draft && !showLibrary`). Ele esconde o cabeçalho da página e o seletor de tipo em qualquer largura. `collapsed` fica na coluna do lg. As pílulas são `useDroppable({id: "folder:<id>"})` e reaproveitam o `handleDndEnd` existente dentro do mesmo `DndContext`. O filtro `activePill` só afeta a renderização.
- Campos dentro de `Collapsible`, com estado em localStorage; ao criar um esboço novo, ele abre aberto.
- `FieldNoteInfoButton`: prop opcional `onSync?: () => Promise<void>`. A rota passa o handler de sync atual (push/pull já existentes), e o botão fica desativado quando `navigator.onLine` é falso.
- Leitor (linha ~2214 e `FieldNoteFullscreenDialog`): remover borda e `max-h`, usar `max-w-[68ch] mx-auto text-[17px] leading-8`. Versículos com token `bg-primary/10`. Só tokens de `src/styles.css`.
- Sem mudanças em `*.functions.ts`, nos hooks de sync, no banco ou no formato das notas.
