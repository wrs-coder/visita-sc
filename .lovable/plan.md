# Etapa 5: dividir as duas telas gigantes (Dashboard e Esboços)

Última etapa do plano de análise. Objetivo: o app abrir mais rápido e travar menos ao digitar, **sem mudar nada do que você vê nem de como funciona**. Mesmo layout, mesmas abas, mesmos botões, mesmos dados.

## Situação hoje
- Painel (Dashboard): cerca de 105 mil caracteres num único arquivo de 2.250 linhas.
- Esboços pessoais: cerca de 105 mil caracteres num único arquivo.
- Tudo é carregado e redesenhado junto: ao mexer num cartão, a tela inteira é recalculada.

## O que muda (só por dentro)
Feito em três rodadas separadas, com testes entre elas. A primeira é a mais rápida e segura.

### Rodada 0 — Balão bíblico instantâneo (item que ficou faltando)
Hoje os versículos já ficam guardados no aparelho, organizados por livro e capítulo. Mas cada vez que você toca numa referência, o app volta a ler o capítulo do armazenamento e espera. A melhoria:
1. **Capítulos já abertos ficam na memória** enquanto o app estiver aberto: tocar de novo na mesma referência abre na hora.
2. **Leitura antecipada:** ao abrir um esboço, os capítulos citados nele são carregados em segundo plano, antes de você tocar.
3. **Bíblia ativa preparada na abertura do app**, sem esperar o primeiro toque.
4. Nada é reimportado nem regravado: destaques, idiomas e Bíblias atuais continuam iguais. Ao remover ou trocar de Bíblia, a memória é limpa.

### Rodada A — Painel
1. Cada uma das 5 telas (Hoje, Esboços, Visita, Pastoreio, Amanhã) vira uma peça separada.
2. Os cartões grandes (Reuniões da semana, Reunião de Campo, Estudos e Revisitas, Refeições, Transporte, Pastoreio, Checklist, Recados) viram peças próprias que só se redesenham quando os dados delas mudam.
3. Telas que você não está vendo no celular carregam depois da primeira, em segundo plano.
4. A busca dos dados, o cache offline e a pílula da congregação ficam exatamente como estão.

### Rodada B — Esboços pessoais
1. Editor, tela cheia, cronômetro, importação .docx, lixeira/desfazer e lista de esboços viram peças separadas.
2. Editor e tela cheia carregam só ao abrir um esboço; a lista abre primeiro.
3. Rascunhos, salvamento, anexos, recuos do Word e balão bíblico sem alteração de comportamento.

## O que NÃO é tocado
Banco de dados, login, PIN, biometria, sincronização, Bíblia, PDFs, textos e cores.

## Riscos
Médio pelo volume de código, mitigado por: uma tela por rodada, verificação de código e todos os testes após cada rodada, e teste no navegador em tamanho de celular com sua conta (abas, cartões, abrir/editar/salvar um esboço, cronômetro em tela cheia).

## Detalhes técnicos
- Extrair componentes para `src/components/dashboard/pages/*` e `src/components/outlines/*`, com props tipadas; estado/queries continuam no route (ou hooks dedicados), envolvendo cartões em `React.memo`.
- `React.lazy` + `Suspense` para páginas fora da tela no pager (mantidas montadas após primeira exibição, conforme regra do AGENTS.md) e para editor/fullscreen.
- Registrar no `AGENTS.md` a regra de organização das telas grandes.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright 393px.
