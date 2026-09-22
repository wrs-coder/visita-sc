# Corrigir a detecção de textos bíblicos nos modos Esboço e Tela Cheia

## O que descobrimos

Testamos o reconhecimento das referências direto no código e encontramos duas causas reais:

1. **A leitura da nota procura as referências pedaço por pedaço.** No modo edição, o app junta o texto inteiro da nota antes de procurar. Já no modo esboço e na tela cheia, a procura acontece separadamente em cada trechinho de texto. Quando uma referência fica dividida — porque parte dela está colorida, em negrito, com outro tamanho de letra, ou porque houve quebra de linha no meio — nenhum dos pedaços tem a referência completa e o link não aparece. É por isso que "achou no modo edição e não achou no esboço/tela cheia".

2. **Faltam abreviações na lista de nomes.** "1Te" e "2Te" não são reconhecidos em lugar nenhum (nem na edição): a lista de Tessalonicenses tem "1ts", "1tes", "1tess", "1th", mas não "1te"/"2te". Confirmado em teste: `1 Tessalonicenses 3:1` funciona, `1Te 3:1` e `2Te 2:3-5` não.

O aviso "Referência não encontrada" (erro de digitação) usa exatamente o mesmo caminho de leitura, por isso também falha na tela cheia pelo motivo 1.

## O que será feito

### 1. Procurar a referência no parágrafo inteiro
Mudar a leitura da nota para juntar o texto de cada parágrafo/item de lista antes de procurar as referências, em vez de olhar cada pedacinho isolado. O link (e o aviso de referência com erro de digitação) passa a aparecer mesmo quando a referência está parcialmente colorida, em negrito, com tamanho diferente ou quebrada no meio. A formatação original continua igual: só o trecho da referência vira link.

Isso corrige de uma vez os dois modos de leitura (esboço e tela cheia), nas duas sub-abas ("Consideração de Campo" e "Esboço") e também na tela cheia aberta pelo painel inicial, porque todos usam o mesmo componente de leitura.

### 2. Completar as abreviações
Acrescentar as abreviações que faltam, começando por "1Te", "2Te" e equivalentes em inglês e espanhol, e revisar os demais livros com número na frente (1/2 Timóteo, 1/2 Coríntios, 1/2 Pedro, 1/2 João, 1/2 Reis, 1/2 Samuel, 1/2 Crônicas).

### 3. Testes automáticos de garantia
Criar testes cobrindo: nomes completos e abreviações nos três idiomas, intervalos ("3:1-5"), listas ("3:1,3,5"), referência dividida por formatação, e referência com erro de digitação — para que essas falhas não voltem.

### 4. Conferência no app
Abrir a nota nos três modos (edição, esboço e tela cheia) e confirmar que o mesmo texto mostra os mesmos links clicáveis, que o balão do versículo abre e que a sugestão de referência errada aparece.

## Detalhes técnicos

- `src/lib/rich-content.tsx`: hoje `renderNode` chama `findCitations`/`findUnknownCitations` por text node. Passar a montar, para cada elemento de bloco, a string concatenada dos seus text nodes descendentes com offsets, rodar a detecção uma única vez sobre essa string e depois fatiar os matches de volta nos nodes correspondentes (um match que atravessa nodes é renderizado no primeiro node e os trechos consumidos são suprimidos nos seguintes). Manter a memoização e as chaves determinísticas já existentes.
- `src/lib/bible-canon.ts`: completar `aliases` dos livros numerados.
- `src/lib/bible-refs.ts`: sem mudança de regex prevista; ajustar só se os testes novos apontarem falha em intervalos/listas.
- Testes em `src/lib/bible-refs.test.ts` e um novo teste de renderização para o caso de referência dividida por spans.
- Sem mudanças em banco, sincronização, anexos, cronômetro ou no parser EPUB.
