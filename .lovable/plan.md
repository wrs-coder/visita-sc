# Bíblia em mais idiomas: avaliação do fluxo JWPUB sugerido pelo Gemini

## Avaliação do fluxo, passo a passo

O fluxo em si está correto na lógica (importar, extrair o `.db`, converter a referência em IDs numéricos e buscar no banco). O problema está em dois pontos que o fluxo não mostra:

1. **Passo 2 — "extrai o nwt_T.db".** A extração funciona, porque o JWPUB é um ZIP. Mas o texto dos versículos dentro desse `.db` fica **comprimido e cifrado**. Extrair o arquivo não significa conseguir ler os versículos. Seria preciso fazer engenharia reversa da cifra, que pode mudar a qualquer atualização do formato.
2. **Passo 4 — "converte a busca para IDs".** Essa conversão depende de uma **lista de nomes e abreviações dos livros em cada idioma** ("João" → 43, "John" → 43, "ヨハネ" → 43). O JWPUB não entrega essa lista pronta. Ou seja, o trabalho principal é o mesmo, independente do formato do arquivo.

Além disso:

3. **Termos de uso.** Os termos do jw.org proíbem engenharia reversa e extração de conteúdo das publicações. Risco para a publicação na Play Store e para a conta de desenvolvedor.
4. **Peso e desempenho.** Ler um `.db` no celular exige um leitor SQLite embutido (cerca de 1 a 1,5 MB a mais) e mais memória na importação, pesado em aparelhos simples.
5. **Regressão.** Substituir o EPUB faria as Bíblias já importadas pararem de funcionar. Grifos, cores, histórico e sugestões dependem dos códigos de livro atuais.

## O que limita os idiomas hoje

Não é o formato do arquivo. A TNM em EPUB já existe em dezenas de idiomas. O que limita a detecção automática é a lista de nomes e abreviações, que hoje cobre só português, inglês e espanhol. Um EPUB em francês até seria importado, mas "Jean 3:16" não seria reconhecido no esboço.

## Recomendação

- Manter o EPUB como está (sem risco, sem quebrar nada).
- Ampliar a detecção para novos idiomas, com nomes completos e abreviações oficiais da TNM de cada um. A escolha dos idiomas fica com você: por exemplo francês, italiano, alemão, japonês e coreano.
- Reconhecer o idioma do EPUB importado automaticamente, para ativar o conjunto de nomes certo.
- Deixar o JWPUB de fora por causa dos pontos 1 e 3. Se um dia houver um jeito oficial e aberto de ler esse formato, ele entra como opção extra, sem substituir o EPUB.

## Detalhes técnicos

- A lista de nomes e abreviações está em `src/lib/bible-canon.ts` e `src/lib/bible-refs.ts`. Cada novo idioma recebe uma tabela própria com os códigos atuais de livro (1 a 66), então grifos e histórico continuam compatíveis.
- Idiomas com escrita não latina (japonês, coreano, chinês) precisam de regras de detecção sem espaço entre o livro e o capítulo, e do separador `:` ou `：`.
- O importador em `src/lib/epub-bible-parser.ts` já lê o idioma do arquivo. Esse idioma passa a escolher a tabela de nomes. As sugestões de "Referência não encontrada" passam a usar o idioma ativo.
- Novos testes para cada idioma (intervalos, listas, falsos positivos). Sem mudanças no banco, nas regras de acesso, no login por PIN/biometria nem nos anexos.
