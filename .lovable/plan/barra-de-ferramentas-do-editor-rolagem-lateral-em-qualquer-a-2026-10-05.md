# Barra de ferramentas do editor: rolagem lateral em qualquer aparelho

## O que acontece hoje
As duas filas da barra (modo padrão) já rolam para o lado, mas a barra de rolagem fica escondida e a barra inteira bloqueia o clique-e-arrastar do mouse (para não tirar o foco do texto). Resultado:
- No celular de verdade, deslizar o dedo funciona.
- Na visualização "Smartphone" do Lovable (e no computador), quem usa mouse não consegue arrastar nem vê que há mais botões; "Criar tópico", fotos, vídeo e link ficam inacessíveis no fim da fila.

## O que vai mudar
1. **Arrastar com o mouse**: clicar e arrastar a fila para o lado passa a rolar (sem tirar o foco do texto; um clique simples continua acionando o botão).
2. **Rodinha do mouse**: girar a rodinha sobre a fila rola para o lado.
3. **Setinhas nas pontas**: quando houver mais botões escondidos, aparece uma pequena seta à esquerda/direita com leve sombreado; tocar nela rola a fila.
4. **Atalhos sempre à vista**: "Criar tópico", foto, vídeo e link ficam no início da segunda fila (não mais no fim), para nunca dependerem de rolagem.
5. Modo imersivo (compacto): conferir que a linha de anexos + "Criar tópico" cabe em 393px; se não couber, aplicar a mesma rolagem com setas.

Nada muda no texto, formatação, anexos, abertura do app ou login.

## Detalhes técnicos
- Novo componente `ScrollRow` em `RichNoteToolbar.tsx` substituindo `row()`: pointer events (só `pointerType === "mouse"`) para drag-scroll com limiar de 5px que cancela o click; `wheel` converte deltaY em scrollLeft; `ResizeObserver` + `scroll` controlam visibilidade das setas (tokens do tema, sem hex).
- Mover o grupo de anexos/tópico para o começo da Fila 2.
- Validar com Playwright em 393px (rolagem por drag e roda, setas, botões clicáveis), `bunx tsgo --noEmit` e `bunx vitest run`.
