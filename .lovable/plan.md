# Análise: esboço pessoal + textos bíblicos

Nenhuma alteração foi feita. Abaixo, o diagnóstico e as melhorias possíveis, em ordem de valor.

## Como funciona hoje

O texto do esboço é varrido por um detector de citações montado a partir dos livros da Bíblia importada (EPUB). Cada citação encontrada vira um link clicável; ao tocar, o app lê o versículo direto do armazenamento do aparelho e mostra num balão arrastável com cor, negrito e grifo. Tudo 100% no dispositivo, sem internet.

## Pontos fortes (não mexer)

- Bíblia totalmente offline, importada do EPUB, com progresso e verificação de espaço.
- Reconhecimento de abreviações em português, inglês e espanhol, incluindo intervalos ("3:1-5") e listas ("3:1,3,5").
- Balão com cor, negrito e grifo salvos; arrastável; duplo toque para fechar.
- Cronômetro, sensor de inatividade, anexos e sincronização dos esboços já maduros.

## Melhorias recomendadas

### 1. Desempenho e estabilidade do balão (prioridade alta)
Hoje, a cada atualização da tela o conteúdo inteiro da nota é reprocessado do zero e todos os elementos recebem identificadores novos. Efeito prático: em notas longas o app fica pesado e o balão de versículo aberto pode fechar sozinho ou perder o grifo/rolagem.
Correção: reaproveitar o conteúdo já processado e usar identificadores estáveis.

### 2. Busca de versículos
Não existe forma de procurar um texto na Bíblia importada — só clicando numa citação já escrita.
Proposta: campo de busca por referência ("Sl 23:1") e por palavra, com resultados clicáveis.

### 3. Ler o capítulo e navegar
O balão mostra só os versículos citados. Faltam "ver capítulo completo" e avançar/voltar versículo ou capítulo.

### 4. Copiar e inserir no esboço
Adicionar botões de copiar o versículo e de inserir o texto direto no esboço (com a referência).

### 5. Limite de 10 versículos
Citações maiores são cortadas em 10 versículos sem aviso. Mostrar "ver mais" com o restante.

### 6. Citação não reconhecida
Se a abreviação tiver erro de digitação, nada acontece e o usuário não entende por quê. Proposta: sugestão do livro mais próximo.

### 7. Acessibilidade
Fechar o balão com a tecla Esc (hoje bloqueado de propósito), grifar por teclado e reposicionar o balão pelas setas.

### 8. Importação do EPUB
A importação trava brevemente a tela em Bíblias grandes. Mover o processamento para segundo plano deixa a barra de progresso fluida.

### 9. Histórico de consultas
Lista dos últimos versículos abertos, para retomar rapidamente.

## Detalhes técnicos

- `src/lib/rich-content.tsx:293-328` — `RichOutlineContent` roda `DOMParser` + sanitização + travessia recursiva a cada render, sem memo; `nextKey()` (`:175-179`) é contador global, o que remonta toda a subárvore (incluindo `VerseLink` aberto) a cada render.
- `src/lib/bible-refs.ts:264-296` — `findCitations` é chamado por text node; o cache (`WeakMap` por identidade de `books`, `:75`) é invalidado sempre que `getActiveLibrary()` recria o array.
- `src/components/bible/BibleVersePopover.tsx:31,170-196` — `MAX_RANGE=10` com corte silencioso; leituras individuais no IndexedDB (poderiam usar `getAll` com `IDBKeyRange`).
- `BibleVersePopover.tsx:326` — `onEscapeKeyDown` prevenido; grifo depende de `window.getSelection()` e arrasto só por Pointer Events.
- `src/lib/epub-bible-parser.ts` + `bible-notes-store.ts:370-395` — parsing no thread principal com chunks de 1000; candidato a Web Worker.

## Sugestão de execução

Fase 1: item 1 (desempenho/estabilidade). Fase 2: itens 2-5 (busca, capítulo, copiar, ver mais). Fase 3: itens 6-9.
