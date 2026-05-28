Resposta ao seu ponto: quase todos os passos do planejamento foram aplicados, mas o plano salvo no projeto só contém oficialmente a Sub-etapa 3.1. Pelo código atual, já existem também a dependência `jszip`, o parser EPUB, o modelo IndexedDB, a UI de Gerenciar Bíblias, a integração na página, as traduções e o popover. O problema restante não é falta desses blocos, é que o parser ainda não está compatível com a estrutura real desse EPUB específico: ele está extraindo só 397 versículos e, por isso, a biblioteca ativa fica incompleta e a detecção de referências não encontra corretamente livros como Mateus.

Plano de correção:

1. Completar o diagnóstico do EPUB no parser atual
   - Ajustar a leitura para não depender apenas de elementos com `id`, `.verse` ou texto puro com números soltos.
   - Cobrir estruturas comuns da Tradução do Novo Mundo em EPUB, onde capítulos/versículos podem estar em spans, anchors, notas, marcadores sobrescritos ou arquivos por capítulo.

2. Reforçar a extração de versículos
   - Criar uma rotina mais tolerante que encontre marcadores de versículo dentro do HTML mesmo quando o texto do versículo está nos irmãos seguintes, no parágrafo pai ou em spans separados.
   - Evitar capturar notas, índices, cabeçalhos e números de capítulo como se fossem versículos.
   - Garantir que arquivos por capítulo sejam gravados com o número de capítulo correto.

3. Melhorar o agrupamento de livros
   - Tratar TOC/nav com níveis extras: partes, seções, livros e capítulos.
   - Agrupar capítulos consecutivos pelo nome real do livro, sem transformar “Mateus 1”, “Mateus 2” etc. em livros separados.
   - Manter IDs estáveis `B01`…`B66` na ordem de leitura.

4. Corrigir reconhecimento de referências no campo de texto
   - Revisar o regex dinâmico para aceitar formatos usados pelo usuário: `mateus 6:33`, `Mateus 6:33`, abreviações e nomes com/sem acento.
   - Corrigir um ponto provável: os termos curtos e longos hoje podem não ser recuperados corretamente se o nome importado vier com variações inesperadas do EPUB.
   - Fazer a detecção funcionar tanto no modo edição quanto no modo esboço.

5. Adicionar validações internas leves
   - Após a importação, mostrar/guardar contagens coerentes: idealmente 66 livros e aproximadamente 31.102 versículos para a Bíblia completa.
   - Se o EPUB importado gerar poucos versículos, retornar erro mais claro em vez de aceitar silenciosamente uma biblioteca incompleta.

6. Atualizar notas técnicas do planejamento
   - Registrar que os passos 1, 2, 4, 5, 6, 7 e 8 já foram implementados.
   - Marcar o parser como etapa em correção/robustez por causa da estrutura específica do EPUB TNM.

Depois de aplicar, você precisará remover a Bíblia importada com 397 versículos e importar novamente o mesmo EPUB.