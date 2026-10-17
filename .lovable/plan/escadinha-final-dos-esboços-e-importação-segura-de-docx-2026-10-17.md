# Escadinha final dos esboços e importação segura de DOCX

## Etapa 1 — Concluir o ajuste dos recuos e títulos (colar do Word)
Com base nas amostras reais `kmse27` e `S-341`:
- Escadinha completa: cada avanço de cerca de 0,5 cm (14,2 pt) vira um degrau. Classes `JWIndent1/2/3` viram 1, 2 e 3 degraus (32, 64 e 96px). `JWIndent0` fica sem recuo.
- Títulos `JWHEADING` entram em negrito automaticamente.
- Âncoras internas do Word (`_Hlk...`) e caracteres invisíveis são removidos.
- Testes automáticos com trechos reais das duas amostras.

## Etapa 2 — Botão "Importar esboço (.docx)"
- Um botão novo na tela de esboços pessoais abre o seletor de arquivo e aceita só `.docx`.
- O arquivo é lido **no próprio aparelho**. Nada é enviado a servidores e nada novo é gravado no banco além do esboço, que é salvo do jeito normal.
- Títulos, parágrafos, negrito, itálico, sublinhado, listas e níveis de recuo são convertidos para o mesmo formato da colagem. Assim, edição, leitura, tela cheia do esboço e tela cheia do Dashboard mostram tudo igual, e a Bíblia automática, o cronômetro, os anexos e os tópicos recolhíveis continuam funcionando.
- Textos novos (botão e mensagens) em português, inglês e espanhol.
- `.doc` e `.jwpub` ficam de fora. O `.doc` antigo é um formato binário inseguro de interpretar, e o `.jwpub` é cifrado e não deve ser usado como fonte. A mensagem orienta o usuário: "Abra no Word e salve como .docx".

## Proteções de segurança da importação
1. **Tamanho máximo do arquivo:** 10 MB. Acima disso, recusa antes de abrir.
2. **Proteção contra "bomba zip":** o tamanho total descompactado é limitado (50 MB), assim como o número de partes do arquivo. Se passar do limite, a leitura para.
3. **Só o texto é lido:** apenas `document.xml`, `styles.xml` e `numbering.xml`. Macros, objetos embutidos, links externos, imagens remotas e scripts são ignorados. Arquivos `.docm` são recusados.
4. **Leitura do XML pelo leitor do próprio navegador:** ele não resolve entidades externas, o que evita ataques do tipo XXE. Erros de leitura viram uma mensagem amigável, sem travar o aplicativo.
5. **Saída montada do zero:** o HTML é gerado só com etiquetas permitidas (`p`, `h2`, `h3`, `ul`, `ol`, `li`, `b`, `i`, `u`, `span` com cor e `margin-left`). Depois passa pelo mesmo filtro de segurança que já protege os esboços hoje. Nenhum atributo do arquivo é copiado direto.
6. **Confirmação antes de salvar:** o usuário vê uma prévia e decide se cria o esboço. Nada existente é sobrescrito.

## Android e iOS
- Android: o seletor de arquivos do sistema já funciona hoje no aplicativo, por exemplo na importação de modelos. Não precisa de nenhuma permissão nova de armazenamento, porque o arquivo escolhido é entregue direto ao aplicativo. O filtro do seletor aceita o tipo do DOCX e também a extensão `.docx`, pois alguns gerenciadores de arquivos não informam o tipo.
- iOS: o aplicativo ainda não tem versão para iPhone. Quando tiver, o mesmo seletor funciona pelo app Arquivos, sem configuração extra.

## Validação
- Testes automáticos: amostra DOCX com 3 degraus e títulos, arquivo grande demais, bomba zip, arquivo que não é DOCX, XML com entidade externa e conteúdo com `<script>`. O conteúdo perigoso tem que sair removido.
- Teste no navegador: importar, salvar e conferir os quatro modos.
- `bunx tsgo --noEmit` e `bunx vitest run` com tudo aprovado.

## O que não muda
Banco de dados, login, Bíblia automática, anexos, cronômetro, tópicos recolhíveis e esboços já salvos.

## Detalhes técnicos
- Etapa 1: `src/lib/word-paste-cleaner.ts` e o teste dele.
- Etapa 2: novo `src/lib/docx-import.ts`, uma função pura que recebe um ArrayBuffer e devolve HTML. Usa uma biblioteca zip leve com limite de bytes descompactados por arquivo e `DOMParser` com `application/xml`. Lê `w:ind` (left/hanging), `w:numPr/w:ilvl`, `w:pStyle` (Heading/JWHEADING) e `w:b/w:i/w:u/w:color`. A saída passa por `cleanWordHtml` e pelo sanitizador de `rich-content.tsx`. O teste fica em `src/lib/docx-import.test.ts`. O botão entra na tela de esboços pessoais e as chaves nos três arquivos de idioma.
- Regra no AGENTS.md: a importação de DOCX é feita só no aparelho, com limites de tamanho e de descompactação, e passa pelo mesmo normalizador e sanitizador da colagem.
