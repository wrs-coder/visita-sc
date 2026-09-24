# Bíblia em mais idiomas: resultado da prova de conceito com o JWPUB

## Resultado do teste no arquivo enviado

Abri o `nwt_T.db` do arquivo que você enviou e li o conteúdo:

- **O que é legível:** a estrutura completa (66 livros, 1.189 capítulos, 31.194 versículos) e os **nomes dos livros em texto normal**, como "Gênesis" e "O Livro de Gênesis".
- **O que NÃO é legível:** o **texto dos versículos**. A coluna com o conteúdo de cada versículo está cifrada. Ela não é texto nem um formato comprimido comum. Os bytes parecem aleatórios, o que é típico de criptografia.

## Conclusão

- A sugestão do Gemini **não funciona como descrita**. Extrair o `.db` é possível, mas o passo 5 ("buscar e exibir o texto") não consegue mostrar os versículos sem quebrar essa cifra.
- Quebrar a cifra seria engenharia reversa. Isso é proibido pelos termos de uso do jw.org, arrisca a conta na Play Store e pode parar de funcionar a qualquer atualização do arquivo.
- Por isso, **não recomendo usar o JWPUB como fonte dos versículos**, nem como formato extra.
- **Nada do que funciona hoje é afetado.** O EPUB continua sendo o formato de importação.

## Caminho recomendado para ter mais idiomas

O que limita os idiomas hoje é a lista de nomes e abreviações dos livros, que cobre só português, inglês e espanhol. O formato do arquivo não é o problema. A TNM em EPUB já existe em dezenas de idiomas.

1. Manter o EPUB como está.
2. Adicionar os nomes e as abreviações oficiais da TNM para novos idiomas, escolhidos por você: por exemplo francês, italiano, alemão, japonês e coreano.
3. Reconhecer automaticamente o idioma do EPUB importado e ativar o conjunto de nomes certo.
4. Fazer as sugestões de "Referência não encontrada", o balão e o histórico funcionarem no idioma ativo.

Um uso opcional e seguro do JWPUB: os **nomes dos livros** vêm legíveis no arquivo. Então, se você quiser, o app pode ler só esses nomes de um JWPUB para aprender o idioma, sem tocar nos versículos. Isso também exigiria um leitor extra de banco de dados (cerca de 1 a 1,5 MB a mais). Minha preferência é embutir as listas de nomes, que é mais simples e leve.

## Riscos do caminho recomendado

Baixos. Cada idioma novo é só uma tabela a mais de nomes, ligada aos mesmos códigos de livro de hoje (1 a 66). Grifos, cores, histórico e Bíblias já importadas continuam funcionando.

## Detalhes técnicos

- A lista de nomes e abreviações está em `src/lib/bible-canon.ts` e `src/lib/bible-refs.ts`. Cada novo idioma recebe uma tabela com os códigos atuais de livro.
- Idiomas com escrita não latina (japonês, coreano, chinês) precisam de regras de detecção sem espaço entre o livro e o capítulo, e aceitar o separador `:` ou `：`.
- `src/lib/epub-bible-parser.ts` já lê o idioma do arquivo. Esse idioma passa a escolher a tabela de nomes.
- JWPUB testado: `BibleVerse.Content` cifrado; `BibleBook` com nomes em texto normal.
- Novos testes para cada idioma (intervalos, listas, falsos positivos). Sem mudanças no banco, nas regras de acesso, no login por PIN/biometria nem nos anexos.

## Decisão pendente

Quais idiomas você quer adicionar primeiro?
