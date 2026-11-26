# Analisador — estudos corretos, cartão no formato S-21 e importação sem falhas

## (01) Por que o caso do Waldir não estava resolvido
O ajuste anterior corrigiu **inativos e irregulares** (só contam meses que estão no cartão da pessoa). Já a regra de **estudos** ("Relatou estudos nos 3 últimos meses seguidos") ainda olha os 3 últimos meses da **congregação**, e não os do cartão da pessoa. Como falta o cartão 2025/2026 do Waldir, agosto/2026 conta como "sem estudos". Você não aprovou a correção da última vez, então ela não foi feita.

Correção (só no Analisador):
- Estudos: mês sem cartão nunca conta como "não dirigiu". A regra usa os últimos meses que existem no cartão da pessoa.
- Se faltar cartão no meio do período, a pessoa aparece com o aviso "Faltam dados: Ago 2026" e não entra em listas negativas por esse mês.
- A mesma checagem vale para pioneiros abaixo de 50 h e meta de 600 h.

## (02) Cartão no formato do S-21 original
Sim, é possível. Ao tocar no nome, abre o cartão igual à imagem:

```text
┌─────────────────────────────────┐
│ REGISTRO DE PUBLICADOR      [x] │
│ Nome: Abraao Ndokel Canga       │
│ Nasc.: 13/06/2009  ☑Masc ☐Fem   │
│ Batismo: —     ☑Outras ovelhas  │
│ ☐Ancião ☐Servo ☐PR ☐PE ☐Miss.   │
├──────┬────┬────┬────┬────┬──────┤
│ 2027 │Part│Est.│Aux │Hrs │Obs.  │
│ Set  │ ☑  │    │ ☐  │    │      │
│ Out  │ ☑  │    │ ☐  │    │      │
│ ...  │    │    │    │    │      │
│      │    │  Total │    │      │
├──────┴────┴────┴────┴────┴──────┤
│ 2026 (mesma tabela)             │
│ Mar  │ ☑  │    │ ☐  │    │Prim..│
└─────────────────────────────────┘
```
- Ano mais recente em cima; todos os anos importados da pessoa, um embaixo do outro.
- Ano ausente aparece como faixa "Cartão 2025/2026 não importado".
- No celular, a tabela cabe na largura (letra menor, rolagem só se precisar). Edição continua pelo botão de editar que já existe.

## (03) Importação sem falhas
- Ao importar, conferência automática de cada cartão: nome, ano, 12 meses, tiques e números. Se algo não for lido com certeza, o cartão fica marcado "Conferir" com o campo duvidoso, em vez de ser adivinhado.
- Aviso quando dois cartões têm o mesmo ano com conteúdo diferente (caso Engracia) e quando falta um ano entre dois cartões.
- Testes automáticos com os PDFs reais já enviados (Waldir, Engracia, Regina) garantindo leitura igual ao cartão.

## Detalhes técnicos
- `analyzer.js`: regra de estudos `last`/`last3` passa a usar os meses de `h.months` dentro do período; novo campo `gaps` por pessoa.
- `app.js`: novo diálogo do cartão em tabela S-21; `style.css` para a tabela; `sw.js` cache v8.
- Testes em `analisador-*.test.ts`; nada fora de `public/ferramentas/Analisador`.
