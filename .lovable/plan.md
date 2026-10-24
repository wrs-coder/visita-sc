# Destaques legíveis no escuro e destaque por trecho na Leitura da Bíblia

## 1. Texto destacado legível nos dois modos escuros (todos os acessos)
- Causa: a regra atual deixa a letra escura só quando não há cor própria no texto. Textos colados do Word ou com cor definida (ex.: branco) mantêm a cor própria, que vence a regra. Os destaques bíblicos (balão, Tela Cheia, Leitura limpa) não têm regra no escuro e herdam letra branca.
- Correção: no escuro e no preto puro, todo trecho destacado (esboços, notas, balão bíblico, leitura da esposa) passa a usar letra escura obrigatória, vencendo a cor própria do texto. O fundo do destaque fica um pouco mais forte para manter bom contraste.
- Nada muda no modo claro nem nos textos salvos.

## 2. Leitura da Bíblia da esposa
- Bolinhas brancas: elas não recebem a classe que pinta a amostra da cor. Passam a mostrar amarelo, verde, azul, rosa e laranja.
- Destacar trechos: ao selecionar parte do versículo com o dedo (ou mouse), aparece a barra de cores e o destaque é aplicado só no trecho. Tocar no versículo sem selecionar continua destacando o versículo inteiro. Tocar num trecho já destacado permite removê-lo. Usa o mesmo formato de destaques do balão, então os destaques continuam iguais nos dois lugares.

## Validação
- Teste para converter a seleção em posições dentro do versículo.
- Verificação de tipos e testes existentes.
- Conferência visual no celular, no modo escuro e no preto puro.

## Detalhes técnicos
- `src/styles.css`: `.dark mark, .dark mark *, .dark .bible-highlight, .dark .bible-highlight *` com `color: var(--highlight-ink) !important`; token `--highlight-ink` em `.dark`; `--bible-hl-alpha` maior em `.dark`.
- `CleanReader.tsx`: adicionar `bible-hl-swatch` às bolinhas; capturar `window.getSelection()` dentro do `<p>` do versículo, calcular offsets usando `data-start` dos segmentos, chamar `addHighlight` com `{start,end,color}`; remover com `removeHighlightAt`. Helper puro de offset em `bible-view-settings.ts` com teste.
