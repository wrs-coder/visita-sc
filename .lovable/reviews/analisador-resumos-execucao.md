# Execução dos ajustes aprovados

- `public/ferramentas/Analisador/analyzer.js`: listas por indicador, situação especial/missionário compatível com os dados antigos e indicador de designados sem estudos segundo a regra selecionada.
- `public/ferramentas/Analisador/app.js`: seleção de situação, abertura das listas e opção de inclusão do novo indicador em todas as modalidades de PDF.
- `public/ferramentas/Analisador/sw.js`: incrementar a cópia offline para distribuir os arquivos atualizados, sem mudar o comportamento do cache.
- `ferramentas-testes/`: testes de situações, pessoas por indicador, critérios de estudos e inclusão/omissão no PDF.
- `roadmap.md`: acompanhar a conclusão dos três ajustes.

A tela usa os controles existentes, conforme os mockups aprovados. O aplicativo, sua versão e o Conversor S-21 não serão alterados. Não há mudança de banco nem chamadas de nuvem; o formato da análise salva e os marcadores especiais existentes serão preservados. PDFs continuarão usando pdf-lib. Não será criado novo módulo.