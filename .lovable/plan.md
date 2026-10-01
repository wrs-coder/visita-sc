# Corrigir o movimento do balão bíblico

## Objetivo
Permitir arrastar o balão pela barra superior e soltá-lo em qualquer posição visível da tela, tanto no esboço quanto na Tela Cheia, sem alterar os recursos de leitura.

## Ajuste
- Separar o posicionamento livre do balão do posicionamento automático da referência. Hoje o arraste altera margens de um balão ainda ancorado pelo posicionador; essa combinação pode limitar ou desfazer o movimento.
- Ao começar o arraste pela barra superior, fixar a posição atual do balão na tela e acompanhar o dedo ou mouse até soltar, sem iniciar arraste ao tocar em copiar, inserir, fechar ou mostrar recursos.
- Respeitar os limites visíveis da tela e recalcular a posição após mudança de tamanho ou orientação. Ao fechar e reabrir, voltar ao posicionamento junto à referência; preservar a alça inferior exclusivamente para ajustar altura.

## Validação
- Testar arraste horizontal e vertical, bordas, controles abertos e fechados e altura ajustada, em tela pequena e computador; repetir na Tela Cheia.
- Conferir que copiar, inserir, fechar, seleção de texto, rolagem e destaques continuam funcionando; executar testes existentes e verificação de tipos.

## Detalhes técnicos
Alterar somente o posicionamento e os eventos de ponteiro em `BibleVersePopover.tsx`, mantendo preferências, versículos importados, dados, login e demais fluxos intactos. Usar coordenadas da janela e limites medidos do próprio balão, sem deslocar o elemento ancorado por margens durante o arraste.
