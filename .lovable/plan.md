# Retirar "Descrição" e exportar notas em Word (.docx)

## 1. Retirar o campo "Descrição"
- Some da tela nas subabas "Esboço" e "Anotações" de "Esboços Pessoais", tanto no modo edição quanto no modo esboço ("Consideração de Campo" já não mostra esse campo).
- A informação já gravada **não é apagada**. Ela continua salva e sincronizada, só fica escondida. Assim nada quebra e nenhum esboço antigo perde dados.

## 2. Exportar para Word (.docx): a forma mais leve
**Recomendação:** gerar o arquivo no próprio aparelho, usando a ferramenta de compactação que o aplicativo **já tem**, a mesma da importação de Word. Nenhuma biblioteca nova é adicionada, o tamanho do aplicativo fica igual, funciona sem internet e nada passa por servidores.

Opções que eu descartei:
- Biblioteca "docx" completa: deixa o aplicativo cerca de 300 KB mais pesado.
- Conversão no servidor: não funciona offline e envia o texto do esboço para fora do aparelho.

**O que vai para o arquivo:** título, parágrafos, negrito, itálico, sublinhado, cores, listas, títulos e a escadinha de recuos (cada degrau vira 0,5 cm no Word). Os tópicos recolhíveis saem abertos. Os anexos entram só como o nome do arquivo, sem a foto ou o vídeo, para manter o arquivo pequeno.

**Onde aparece a opção "Word (.docx)":**
- Superintendente, aba "Esboços Pessoais": no menu "Exportar" de cada esboço nas três subabas e na tela cheia do esboço.
- Esposa, abas "Anotações" e "Estudo Pessoal": no menu de exportar, ao lado de .txt, .md e PDF.
- No celular, o arquivo abre o menu de compartilhar, igual aos outros formatos. No computador, o arquivo é baixado.

**Ida e volta:** um .docx exportado pode ser importado de novo e mantém os recuos.

## Validação
- Testes automáticos: o arquivo gerado é um Word válido, mantém negrito e os 3 degraus, e reimportar devolve o mesmo texto.
- A verificação de tipos e todos os testes precisam passar.

## Detalhes técnicos
- Item 1: remover o bloco `personalOutlines.fields.description` em `_app.consideracoes-campo.tsx`. O campo `description` continua no rascunho, no salvamento e na sincronização.
- Item 2: criar `src/lib/docx-export.ts` com `htmlToDocx(title, html): Promise<Blob>`, feito com JSZip e a montagem de `[Content_Types].xml`, `_rels`, `word/document.xml` e `styles.xml` mínimos. O HTML é percorrido com DOMParser no navegador. `margin-left` em px vira `w:ind` (32px = 284 twips). O texto é escapado em XML. Para compartilhar, reutilizar o mesmo caminho de `share.ts`. Botões em `_app.consideracoes-campo.tsx`, `FieldNoteFullscreenDialog.tsx` e `GuestWorkspace.tsx` (exportAs "docx"). Novas chaves de texto em pt, en e es. Teste em `docx-export.test.ts`, com ida e volta via `importDocx`.
