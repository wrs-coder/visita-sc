# Plano: contagem de versículos da TNM + melhorias do balão bíblico

## Parte A — Quantos versículos tem cada capítulo (do próprio EPUB)

Confirmado no arquivo enviado (Rute 1): antes do texto existe a linha de navegação
`Rute 1 : 1 - 22`, com link para `bibleversenav8_1.xhtml`. Ou seja, o EPUB já diz que
Rute 1 tem 22 versículos. O mesmo padrão existe em todos os idiomas da TNM, porque é a
estrutura do arquivo (classe `w_navigation w_biblebookname`), não o texto.

O que muda:
1. Ao importar a Bíblia, o app lê essa linha de cada capítulo e guarda o número final
   (22) junto da Bíblia, sem mudar os versículos guardados.
2. Conferência na importação: versículos acima do número final são descartados
   (proteção extra contra qualquer "Conteúdo do livro" que escape).
3. Leitura e balão usam o número para saber se um versículo existe:
   "Rute 1:30" passa a mostrar "Rute 1 tem 22 versículos" em vez de balão vazio.
4. Bíblias já importadas não têm esse número: tudo continua como hoje (com o filtro
   já feito). No gerenciador de Bíblias aparece um aviso discreto
   "Reimporte para ativar a conferência de versículos".
5. Se a linha não existir num EPUB diferente, o app simplesmente não confere (nada quebra).

```text
┌─────────────────────────────┐
│ Bíblias                     │
│ ┌─────────────────────────┐ │
│ │ TNM Português     ✓ Ativa│ │
│ │ ⓘ Reimporte para ativar │ │
│ │   a conferência de       │ │
│ │   versículos  [Reimportar]│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

## Parte B — Balão bíblico e textos automáticos (a análise anterior)

O reconhecimento atual ("Jo 3:16" vira link) não muda; só ganha casos novos, cada um
protegido por teste.

Prioridade alta
- Trecho que passa de capítulo: "Mt 5:3–6:2" mostra 5:3 até o fim do 5 e 6:1–2.
- Versículo inexistente: mensagem clara (usa a Parte A) em vez de balão vazio.
- Mensagens separadas: "Bíblia não importada", "Livro não encontrado",
  "Versículo não existe", com botão "Tentar de novo" quando for falha de leitura.

Prioridade média
- Capítulo inteiro sem dois-pontos: "Salmo 23" abre o capítulo (só quando o livro é
  claro, para não confundir com números comuns no texto).
- Ligação com "e": "Jo 3:16 e 17" e listas misturadas "Rom 5:1, 3-5".
- Formas ordinais/romanas: "1.ª Cor", "I Coríntios", "Primeira aos Coríntios".

Prioridade baixa
- Citação partida por negrito/itálico no meio ("**Jo** 3:16").
- Teste com centenas de citações reais tiradas dos esboços, para medir acertos e
  evitar links falsos.

```text
┌─────────────────────────────┐
│ Rute 1:30                 ✕ │
│─────────────────────────────│
│  Rute 1 tem 22 versículos.  │
│  Confira a citação.         │
└─────────────────────────────┘
```

## Riscos e cuidados
- Nenhum texto bíblico guardado é reescrito; notas e destaques não mudam.
- Cada regra nova do reconhecimento entra com testes de "não deve virar link"
  (horários, números de parágrafo, datas).
- Ordem de execução: Parte A primeiro (base da mensagem de versículo inexistente),
  depois alta, média, baixa.

## Detalhes técnicos
- `epub-bible-parser.ts`: ler `p.w_biblebookname a[href^=bibleversenav]` texto
  "1 - N" antes do `hardPurgeDoc`; montar `verseCounts[book][chapter]=N`; cortar
  versos > N.
- Guardar `verseCounts` opcional no registro da biblioteca (`bible-notes-store.ts`);
  ausente = sem conferência. Teste com fixture `1001061112.xhtml`.
- `getChapterFromLibrary`/popover: retornar motivo (`no-bible|no-book|out-of-range|read-error`).
- `bible-refs.ts`: novos padrões com testes positivos e negativos.
