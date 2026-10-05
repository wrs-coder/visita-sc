# Corrigir a barra dos esboços e preparar a versão 4.2.14

## O que aconteceu

No modo compacto, a barra usa duas linhas de cinco grupos. Ao incluir **Criar tópico**, foto, vídeo e link, esses quatro botões foram colocados em uma linha adicional. Por isso a barra passou a ocupar três linhas quando os dados do esboço estão recolhidos.

## Correção

1. Manter a barra compacta com **exatamente duas linhas** no smartphone.
2. Transformar as duas linhas compactas em filas horizontais independentes, usando a mesma rolagem já aplicada no modo normal.
3. Deixar **Criar tópico**, foto, vídeo e link no começo da segunda linha, sempre visíveis ao abrir.
4. Manter depois deles os demais grupos de listas, alinhamento, inserção, tabela e modo foco, acessíveis por deslize, arraste, rodinha e setas laterais.
5. Preservar todos os menus, formatações, recuos, links, tabelas, anexos e foco do editor sem alterar o conteúdo dos esboços.

## Validação

- Conferir visualmente em **393 × 733 px** que a barra ocupa somente duas linhas.
- Testar a rolagem horizontal das duas linhas por arraste e pelas setas.
- Confirmar que **Criar tópico**, foto, vídeo e link abrem corretamente.
- Conferir também o modo normal para garantir que a correção anterior da rolagem permaneceu funcionando.
- Executar a verificação de tipos e os testes automatizados do projeto.

## Versão para a Play Store

1. Atualizar o aplicativo de **4.2.13 (código 23)** para **4.2.14 (código 24)** no pacote Android, na identificação interna e na tela de entrada.
2. Manter o aviso automático apontando para a última versão já aprovada na loja; a 4.2.14 só será anunciada aos usuários depois da aprovação da Play Store.
3. Gerar o arquivo AAB assinado para envio e conferir a assinatura com a verificação já existente no projeto.
4. Entregar também um texto curto de “O que há de novo” mencionando a correção da barra e os ajustes acumulados desde a versão publicada.

## Limites

A alteração ficará restrita à apresentação e interação da barra do editor. Não serão modificados a abertura do aplicativo, login, armazenamento, sincronização, Bíblia ou conteúdo dos esboços.
