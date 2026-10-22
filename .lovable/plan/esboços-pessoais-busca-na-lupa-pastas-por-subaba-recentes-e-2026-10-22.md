# Esboços Pessoais: busca na lupa, pastas por subaba, recentes e pasta obrigatória

Sim, as quatro melhorias são realistas e práticas. Nenhuma muda o banco nem o formato dos esboços.

## (01) Busca pela lupa
- O campo grande de busca some. No lugar fica um botão de lupa ao lado de "+ Novo".
- Tocar na lupa abre um campo "Tema do esboço" com o botão "Procurar".
- O resultado mostra os esboços da subaba aberta que tenham o tema:
  - no título, no tema do discurso e no texto do esboço;
  - também parecidos: sem diferenciar acentos e maiúsculas, e aceitando palavras em qualquer ordem. Por exemplo, "esperanca reino" encontra "O Reino, nossa esperança".
- Primeiro aparecem os que batem no título, depois os que batem só no texto.
- Um "x" fecha a busca e volta à lista normal.

## (02) Pastas separadas por subaba
- Hoje as pastas já são filtradas por tipo, mas ainda aparecem pastas de outra subaba. Por isso, o primeiro passo é ver nos dados do aparelho quais pastas estão escapando e por quê. Ainda não confirmei a causa. As suspeitas são pastas antigas sem tipo ou com o tipo errado, e a subaba "Anotações" usando o tipo de outra.
- Correção:
  - cada pasta fica só na subaba onde foi criada;
  - pastas antigas sem tipo vão para a subaba onde estão seus esboços;
  - se uma pasta antiga tiver esboços de duas subabas, ela é copiada com o mesmo nome para cada uma. Nenhum esboço se perde.
- O filtro de pílula volta para "Todos" ao trocar de subaba.

## (03) Recentes
- Logo abaixo de "Pastas e notas" aparece a faixa "Recentes" com os 5 últimos esboços abertos, criados ou editados na subaba.
- Tocar num recente abre o esboço.
- A lista fica guardada só no aparelho e some sozinha quando o esboço vai para a lixeira.

## (04) Raiz invisível e pasta obrigatória
- A pasta "Raiz" continua existindo por dentro, mas deixa de aparecer na lista, nas pílulas e nos seletores.
- Ao criar um esboço, seja "Novo esboço" ou "Importar Word", abre antes uma janela "Salvar em qual pasta?". Ela mostra as pastas da subaba e um atalho "+ Nova pasta". O botão "Criar" só funciona depois de escolher uma pasta.
- Esboços antigos que já estão na Raiz continuam funcionando. Eles aparecem num grupo discreto "Sem pasta" até serem movidos. Se você preferir, eles podem ficar só na busca e nos recentes.
- As pastas fixas "Esboços da Semana" e "Considerações da Semana" continuam como estão.

## O que não muda
- O salvamento, a sincronização com a nuvem, a lixeira, os anexos, o cronômetro e o recurso de arrastar e soltar.

## Detalhes técnicos
- `_app.consideracoes-campo.tsx`:
  - `searchOpen` com o estado da busca. `matchesQuery` passa a normalizar o texto (NFD, sem acentos), dividir em termos e procurar no título, em `talk.talk_title` e no texto puro do conteúdo, ordenando por relevância.
  - Lógica de busca e de recentes em `src/lib/outline-search.ts` e `src/lib/recent-outlines.ts`, com localStorage por tipo e no máximo 5 ids.
- Pastas: diagnosticar com uma leitura dos dados locais de `bible-notes-store`, depois tornar o filtro de `listFolders(type)` estrito e acrescentar uma migração local idempotente em `sanitize`.
- Raiz: o droppable "root" e as opções "Raiz (sem pasta)" saem da interface. `folderId` nulo continua válido nos dados.
- Diálogo `ChooseFolderDialog` antes de `createNote` e da importação de DOCX.
- Testes: busca sem acento e por termos, limite e ordem dos recentes, e migração de pasta mista.
