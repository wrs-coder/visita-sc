# Subtítulos JW como tópicos e selo de tempo sempre visível

## Causa (01)
Ao importar o DOCX do JW, subtítulos como "UM LEMBRETE AMOROSO (4 min)" viram um parágrafo inteiro em negrito, não um subtítulo (H3). O botão "Converter subtítulos em tópicos" hoje só procura H3, por isso ignora esses títulos.

## O que muda
1. **Botão de relógio reconhece o formato JW**: além do H3, passa a tratar como subtítulo o parágrafo que seja **todo em negrito** e **tenha o tempo escrito** ("(4 min)", "4 min.", "4 minutos"). Exigir o tempo evita transformar frases em negrito comuns em tópicos.
   - Os minutos entram sozinhos (4 min).
   - O conteúdo até o próximo subtítulo vai para dentro do tópico.
   - Pode desfazer com "desfazer". Nada mais no texto é alterado.
2. **Selo do tempo acompanha a rolagem**: nos modos esboço e tela cheia, o cabeçalho do tópico (título + selo "até 19:42") fica preso no topo da tela enquanto o orador lê aquele tópico. Ao passar para o próximo, o novo cabeçalho assume. Fundo discreto e semitransparente, sem cobrir o texto.

## O que não muda
Banco, sincronização, formato salvo, cronômetro, Bíblia automática, anexos, importação DOCX e esboços já salvos (só mudam quando o orador tocar no botão).

## Validação
- Teste: parágrafo negrito "UM LEMBRETE AMOROSO (4 min)" vira tópico com 4 min; negrito sem tempo não vira; H3 continua funcionando.
- Abrir no navegador (celular 393px) e conferir o cabeçalho preso no topo ao rolar.
- `bunx tsgo --noEmit` e `bunx vitest run`.

## Detalhes técnicos
- `outline-topic.ts` → `convertHeadingsToTopics`: novo critério `isBoldTimedParagraph(child)` = paragraph cujo texto não vazio está 100% coberto pela mark `bold` e `parseTopicMinutes(text)` não é null. Tratado igual ao H3 (início de grupo). Teste em `outline-topic-convert.test.ts`.
- `OutlineTopicBlock.tsx`: cabeçalho com `sticky top-0 z-10 bg-background/90 backdrop-blur`; verificar que o contêiner de rolagem da tela cheia não tem `overflow` intermediário que quebre o sticky (ajuste só de classes).
