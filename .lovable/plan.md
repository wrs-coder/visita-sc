# Balão bíblico: leitura primeiro

## Resultado esperado
- Ao abrir uma referência no esboço ou na Tela Cheia, o balão prioriza o texto bíblico. O cabeçalho continua mostrando a referência e mantém copiar, inserir (quando disponível) e fechar.
- Um botão com ícone e descrição acessível alterna entre **mostrar** e **ocultar** os recursos adicionais. Ao expandir, aparecem as opções atuais de fundo, negrito, tamanho da letra, cores de destaque, capítulo e navegação; ao recolher, nada é perdido. O texto continua rolável, selecionável e destacável; a alça de altura continua acessível.
- O tamanho de letra escolhido permanece salvo no aparelho e se aplica igualmente a todos os balões, inclusive os abertos pelo esboço e pela Tela Cheia. O tamanho do texto do esboço não deve multiplicar o tamanho do texto bíblico no balão.

## Segurança e compatibilidade
- Usar o componente único do balão já compartilhado entre as telas, sem alterar o EPUB importado, a Bíblia armazenada, os destaques, o banco, o login ou o comportamento de fechar e arrastar.
- O modo compacto é o padrão ao abrir cada balão; expandir/recolher altera apenas a apresentação daquele balão. Preferências de fundo, negrito, altura, cor e tamanho já salvas permanecem intactas.
- Conferir em telas pequenas que o cabeçalho e os controles expandidos não cortem o texto nem encubram a alça; o conteúdo deve ganhar o espaço liberado sem saltos de posicionamento.

## Detalhes técnicos e verificação
- Ajustar `BibleVersePopover.tsx` para alternar a visibilidade das duas barras de controles; conservar ações essenciais no cabeçalho e o redimensionamento. Usar rótulos acessíveis e indicação do estado expandido.
- Reutilizar `textScale` de `bible-view-settings.ts`, que já é persistido em `bible:view-settings`; separar o `fontScale` do texto do esboço (aplicável ao link) da escala do texto do balão. Não criar outra chave nem migrar dados.
- Acrescentar testes de regressão para preferência de tamanho entre balões e para o estado compacto/expandido; validar testes e tipos. Conferir no navegador em largura de celular e desktop: abertura no esboço e Tela Cheia, expandir/recolher, alterar a letra, fechar/reabrir e ver o mesmo tamanho em outra referência.
