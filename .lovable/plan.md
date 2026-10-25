# Botão do relógio reconhecer qualquer subtítulo com "(N min)"

## Causa provável
A regra atual exige que o subtítulo seja H3 ou um parágrafo **inteiramente marcado em negrito pelo editor**. No esboço aberto, o título "UM LEMBRETE AMOROSO (4 min)" não passa nesse filtro: pode ter chegado sem a marca de negrito (importado antes do ajuste do Word), com negrito só na cor/estilo, ou como título de outro nível (H1/H2). Não consigo ler o esboço do seu aparelho para confirmar qual dos casos é.

## O que muda
1. Passa a contar como subtítulo de tópico qualquer linha do nível principal que:
   - **termine com o tempo entre parênteses**, como "(4 min)", "(4 min.)", "(10 minutos)", e
   - seja curta (até 120 letras), e
   - seja título (qualquer nível) **ou** esteja em negrito **ou** esteja toda em MAIÚSCULAS.
   Isso cobre o padrão JW sem pegar frases comuns que só citam minutos no meio do texto.
2. Linhas já dentro de um tópico continuam intocadas.
3. Mensagem mais clara quando nada for encontrado: "Nenhum subtítulo com tempo, como (4 min), foi encontrado."

## O que não muda
Banco, formato salvo, cronômetro, importação DOCX, selo preso no topo e demais recursos.

## Validação
- Testes: "UM LEMBRETE AMOROSO (4 min)" sem negrito (maiúsculas) vira tópico de 4 min; em H2 também; frase comum "leia por 4 min hoje" não vira; H3 e negrito continuam funcionando.
- `bunx tsgo --noEmit` e `bunx vitest run`.

## Detalhes técnicos
- `outline-topic.ts`: trocar `isBoldTimedParagraph` por `isTimedTitleBlock(node)`: tipo paragraph ou heading; texto trim ≤120; regex de tempo entre parênteses no fim `/\(\s*\d{1,3}\s*min(?:utos?)?\.?\s*\)\s*$/i`; e (heading || todo texto com mark bold || texto === texto.toLocaleUpperCase("pt-BR") com letras). Usar como início de grupo; headings sem tempo de nível ≤3 seguem como fronteira.
- `RichNoteToolbar.tsx` linha 215: nova mensagem em PT/EN/ES (`personalOutlines.topics.noHeadings`).
