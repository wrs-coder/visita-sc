# Bíblia em mais idiomas: avaliação do JWPUB com base no manifest real

## O que o manifest confirma

O `manifest.json` enviado é legível e confirma a primeira parte do fluxo do Gemini:

- `publication.fileName`: `nwt_T.db` — o banco de dados dos versículos.
- `publication.language`: `5` — código do idioma (5 = português).
- `publication.title`: "Tradução do Novo Mundo da Bíblia Sagrada".
- `expandedSize`: ~59 MB descompactado.

Ou seja: identificar o arquivo e o idioma é fácil e confiável.

## O ponto que o manifest não responde

O manifest não diz nada sobre **como o texto dos versículos está guardado** dentro do `nwt_T.db`. Esse é o ponto decisivo. Em publicações desse formato, o conteúdo costuma estar comprimido ou cifrado. Se estiver, extrair o `.db` não basta — seria preciso engenharia reversa, que é frágil e viola os termos de uso do jw.org (risco para a Play Store e para a conta de desenvolvedor).

## Proposta: prova de conceito antes de qualquer decisão

Antes de escolher o caminho, fazer um teste rápido e sem risco:

1. Você me envia (ou disponibiliza) um arquivo `.jwpub` pequeno de exemplo, ou apenas o `nwt_T.db` extraído dele.
2. Eu inspeciono o `.db`: listo as tabelas e tento ler alguns versículos.
3. Com o resultado, a decisão fica objetiva:
   - **Se o texto for legível direto** → o JWPUB vira opção real de importação, ao lado do EPUB, sem substituí-lo.
   - **Se estiver comprimido/cifrado** → descartamos o JWPUB e seguimos com o caminho recomendado abaixo.

## Caminho recomendado (independente do formato)

O que limita os idiomas hoje não é o formato do arquivo — a TNM em EPUB já existe em dezenas de idiomas. O que limita é a lista de nomes e abreviações dos livros, que hoje cobre só português, inglês e espanhol. Um EPUB em francês até seria importado, mas "Jean 3:16" não seria reconhecido no esboço.

Recomendação:

- Manter o EPUB como está (sem risco, sem quebrar nada).
- Ampliar a detecção para novos idiomas, com nomes completos e abreviações oficiais da TNM de cada um. A escolha dos idiomas fica com você: por exemplo francês, italiano, alemão, japonês e coreano.
- Reconhecer o idioma do arquivo importado automaticamente, para ativar o conjunto de nomes certo.
- Se a prova de conceito mostrar que o JWPUB é legível, ele entra como formato extra de importação, com o mesmo mecanismo de idiomas.

## Riscos de cada caminho

| Caminho | Risco técnico | Risco jurídico | Quebra o que existe? |
|---|---|---|---|
| Ampliar idiomas no EPUB | Baixo | Nenhum | Não |
| JWPUB se o `.db` for legível | Médio (leitor SQLite embutido, +1 a 1,5 MB, importação mais pesada) | A verificar nos termos de uso | Não, se for aditivo |
| JWPUB se o `.db` for cifrado | Alto (engenharia reversa frágil) | Alto (termos do jw.org proíbem) | Sim, se substituir o EPUB |

## Detalhes técnicos

- A lista de nomes e abreviações está em `src/lib/bible-canon.ts` e `src/lib/bible-refs.ts`. Cada novo idioma recebe uma tabela própria com os códigos atuais de livro (1 a 66), então grifos e histórico continuam compatíveis.
- Idiomas com escrita não latina (japonês, coreano, chinês) precisam de regras de detecção sem espaço entre o livro e o capítulo, e do separador `:` ou `：`.
- O importador em `src/lib/epub-bible-parser.ts` já lê o idioma do arquivo. Esse idioma passa a escolher a tabela de nomes. As sugestões de "Referência não encontrada" passam a usar o idioma ativo.
- Para o JWPUB (se viável): leitura do ZIP no navegador, extração do `.db`, leitor SQLite embutido, mapeamento `BookID/Chapter/Verse` para os códigos atuais. Importação continua manual e feita pelo usuário.
- Novos testes para cada idioma (intervalos, listas, falsos positivos). Sem mudanças no banco, nas regras de acesso, no login por PIN/biometria nem nos anexos.

## Próximo passo

Me envie um `.jwpub` de exemplo (ou o `nwt_T.db` extraído) para a prova de conceito. Com o resultado, fecho a decisão entre "EPUB com mais idiomas" e "EPUB + JWPUB".
