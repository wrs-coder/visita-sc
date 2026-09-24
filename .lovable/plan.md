# Bíblia em mais idiomas: JWPUB vs EPUB

## Resposta curta

Trocar EPUB por JWPUB **quebraria** a função atual se fosse feito do jeito da sugestão do Gemini. Adicionar o JWPUB **ao lado** do EPUB, sem remover nada, não quebra. Mas o formato não é o que limita os idiomas hoje.

## O que limita os idiomas hoje

A Bíblia TNM em EPUB já existe em dezenas de idiomas. O que limita a detecção automática é a **lista de nomes e abreviações dos livros**. Hoje ela cobre só português, inglês e espanhol. Um EPUB em francês ou japonês até seria importado, mas "Jean 3:16" ou "ヨハネ 3:16" não seriam reconhecidos no esboço.

Então, para ter mais idiomas, o caminho mais barato e sem risco é **ampliar essa lista de nomes**. O formato do arquivo pode continuar o mesmo.

## Riscos do JWPUB

1. **Conteúdo cifrado.** Dentro do JWPUB, o texto dos versículos fica comprimido e cifrado. O pseudocódigo do Gemini só extrai o arquivo `.db`, mas não consegue ler os versículos. Seria preciso fazer engenharia reversa da cifra. Isso é frágil (pode mudar a qualquer momento) e juridicamente arriscado.
2. **Termos de uso.** Os termos do jw.org proíbem engenharia reversa e extração de conteúdo das publicações. Isso é um risco para a publicação na Play Store e para a conta de desenvolvedor.
3. **Peso e desempenho.** Ler um arquivo `.db` no celular exige um leitor SQLite embutido (cerca de 1 a 1,5 MB a mais). A importação também gasta mais memória em aparelhos simples.
4. **Regressão.** Substituir o EPUB faria as Bíblias já importadas pelos usuários pararem de funcionar. Grifos, cores, histórico e sugestões dependem dos códigos de livro atuais.
5. **"Idioma MEPS".** O número do idioma no JWPUB não traz os nomes dos livros. Ainda seria preciso criar a lista de nomes e abreviações de cada idioma, ou seja, o mesmo trabalho do caminho recomendado.

## Recomendação

- Manter o EPUB como está (sem risco).
- Ampliar a detecção para novos idiomas, com nomes completos e abreviações oficiais da TNM de cada um. A escolha dos idiomas fica com você: por exemplo francês, italiano, alemão, japonês e coreano.
- Reconhecer o idioma do EPUB importado automaticamente, para ativar o conjunto de nomes certo.
- Deixar o JWPUB de fora por causa dos riscos 1 e 2. Se um dia houver um jeito oficial e aberto de ler esse formato, ele entra como opção extra, sem substituir o EPUB.

## Detalhes técnicos

- A lista de nomes e abreviações está em `src/lib/bible-canon.ts` e `src/lib/bible-refs.ts`. Cada novo idioma recebe uma tabela própria com os códigos atuais de livro (1 a 66), então grifos e histórico continuam compatíveis.
- Idiomas com escrita não latina (japonês, coreano, chinês) precisam de regras de detecção sem espaço entre o livro e o capítulo, e do separador `:` ou `：`.
- O importador em `src/lib/epub-bible-parser.ts` já lê o idioma do arquivo. Esse idioma passa a escolher a tabela de nomes. As sugestões de "Referência não encontrada" passam a usar o idioma ativo.
- Novos testes para cada idioma (intervalos, listas, falsos positivos). Sem mudanças no banco, nas regras de acesso, no login por PIN/biometria nem nos anexos.
