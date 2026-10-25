# Tempo por tópico também em subtítulos (H3)

## Causa
Hoje o relógio por tópico só existe nos blocos de "Tópico recolhível" (botão de tópico na barra do editor). Subtítulos comuns (H3) não recebem relógio, por isso nada apareceu.

## Como usar já (sem mudança)
Selecione o texto do subtítulo, toque no botão "Tópico" da barra, depois no relógio no cabeçalho do tópico e informe os minutos.

## Proposta
1. Botão "Converter subtítulos em tópicos" no editor: cada H3 vira um tópico recolhível com o conteúdo até o próximo H3; se o título tiver "(5 min)", os minutos já vêm preenchidos.
2. Nada muda no texto salvo além dessa conversão, feita só quando o orador tocar no botão (pode desfazer com Ctrl+Z / desfazer).

## Detalhes técnicos
- Novo comando TipTap em outline-topic.ts que percorre o doc, agrupa blocos a partir de cada heading nível 3 e envolve em outlineTopic com title = texto do H3 e minutes = parseTopicMinutes(title).
- Botão na toolbar de RichNoteEditor; teste unitário da conversão.
