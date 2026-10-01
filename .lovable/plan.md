# Balão de textos bíblicos: leitura e destaques

## Escopo
Fazer agora só a leitura do balão e os destaques coloridos, inclusive na Tela Cheia. Não mexer em idiomas, importação EPUB, versículos guardados, banco de dados nem login/PIN/biometria.

## 1. Leitura do balão
- Botões A- / A+ para mudar o tamanho da letra só no texto bíblico, com limites legíveis e preferência salva no aparelho.
- Manter a rolagem interna e acrescentar versículo anterior/próximo. A navegação para no início e no fim do capítulo, sem pular para o livro errado.
- Alça inferior para ajustar a altura do balão. A altura escolhida é salva e fica limitada à área visível, sem esconder botões nem passar das áreas seguras do celular.
- Preservar: capítulo inteiro, capítulos anterior/próximo, copiar, inserir no esboço, arrastar, fechar, fundo, negrito e histórico.

## 2. Destaques
- Ao destacar um trecho, escolher entre amarelo, verde, azul, rosa e laranja.
- Os destaques antigos continuam amarelos. Remover destaque continua funcionando.
- Cores legíveis em todos os fundos atuais do balão.

## Validação
- Testes automáticos para limites de letra/altura, navegação de versículos, leitura dos destaques antigos, novas cores e remoção.
- Rodar os testes existentes e a verificação de tipos.
- Conferir visualmente em celular e computador, no esboço e na Tela Cheia, com um capítulo longo.

## Detalhes técnicos
- Preferências em `src/lib/bible-view-settings.ts`: `fontScale` e `height` opcionais com valores padrão; leitura tolerante a dados antigos.
- Destaques: `color` opcional por trecho; ausência de cor é tratada como `yellow`. `buildSegments` passa a devolver a cor sem mudar a chave de armazenamento.
- Balão em `src/components/bible/BibleVersePopover.tsx`: navegação calculada a partir do capítulo já carregado; redimensionamento por Pointer Events limitado ao viewport.
- Cores via tokens novos em `src/styles.css`, sem cores avulsas nos componentes.
