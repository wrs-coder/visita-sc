## Plano

1. **Detectar os 66 livros bíblicos em múltiplos idiomas**
   - Criar um catálogo canônico interno com os 66 livros e seus aliases em vários idiomas comuns, incluindo português, inglês, espanhol, francês, alemão, italiano e formas sem acento.
   - Não depender apenas do idioma do app nem do título exato no EPUB.
   - Mapear cada livro para IDs estáveis `B01` a `B66`, independentemente de o EPUB usar “Mateus”, “Matthew”, “Mateo”, “Matthieu”, “Matthäus”, etc.

2. **Agrupar corretamente o spine/TOC do EPUB**
   - O EPUB atual mostra `spine=3935` e `slots=196`, então o parser não deve tratar cada item do TOC como livro.
   - Usar o catálogo multilíngue para distinguir livros bíblicos reais de prefácios, notas, índices, apêndices e páginas de conteúdo.
   - Agrupar arquivos consecutivos do mesmo livro, mesmo quando cada capítulo/parte estiver em um XHTML separado.

3. **Corrigir extração de versículos da TNM e de EPUBs similares**
   - Ler marcadores de versículo por IDs, classes, âncoras, `epub:type`, `<sup>` e padrões textuais.
   - Coletar o texto entre marcadores sem capturar notas, índices ou referências cruzadas como versículos.
   - Deduplicar por `bookId + chapter + verse` e manter o texto mais completo.

4. **Validar a importação antes de aceitar a Bíblia**
   - Exigir contagens coerentes para uma Bíblia completa, idealmente 66 livros e dezenas de milhares de versículos.
   - Se a importação ficar parcial, mostrar erro/aviso claro em vez de salvar silenciosamente uma Bíblia incompleta.
   - Registrar no console livros encontrados, livros faltantes, arquivos ignorados e total final.

5. **Corrigir reconhecimento de referências no texto**
   - Reconhecer referências usando aliases multilíngues e normalização: maiúsculas/minúsculas, acentos, pontos e abreviações.
   - Exemplos esperados: `Mateus 6:33`, `mateus 6:33`, `Mat. 6:33`, `Matthew 6:33`, `Mateo 6:33`.
   - Garantir funcionamento no modo Edição e no modo Esboço da página `/consideracoes-campo`.

6. **Tratar separadamente o erro do manifest**
   - `manifest.webmanifest 401` não parece ser a causa da importação parcial.
   - Verificar se o manifesto público está sendo bloqueado por autenticação e ajustar apenas se necessário.

## Notas técnicas

- IndexedDB, UI de gerenciamento, i18n e dependência `jszip` já estão implementados.
- O ponto crítico agora é tornar o parser realmente canônico e multilíngue, em vez de inferir livros apenas pelo TOC do EPUB.
- Depois da correção, será necessário remover a Bíblia parcial e importar novamente o EPUB.