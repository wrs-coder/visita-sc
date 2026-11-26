# Analisador — estudos corretos, cartão no formato S-21 e importação sem falhas

## (01) "Ano atual marca ativos como inativos" — já foi resolvido
Esse problema foi corrigido na atualização do dia 25/11 (regra do mês do aparelho). Hoje o Analisador só avalia até o **mês anterior ao atual** (em novembro/2026, até outubro/2026). Meses futuros não contam como "sem pregar" nem para inativos, nem para irregulares, totais e PDFs. Escolher "Ano 2027" não move mais ninguém para Inativos.
- Vou acrescentar um teste automático que simula escolher o ano atual pela metade e confirma que nenhum publicador ativo vira inativo.
- Se você ainda vê alguém ativo em "Inativos", feche e abra o Analisador para o aparelho trocar a cópia antiga.

### Caso do Waldir (estudos) — ainda falta corrigir
A regra de estudos ainda olha os últimos meses da congregação, não os do cartão da pessoa. Correção:
- Mês sem cartão nunca conta como "não dirigiu"; a regra usa os últimos meses que existem no cartão da pessoa.
- Faltando cartão no período, aparece "Faltam dados: Ago 2026" e a pessoa não entra em listas negativas por esse mês.
- Mesma checagem para pioneiros abaixo de 50 h e meta de 600 h.

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
- Cada ano pode ser recolhido ou expandido tocando na faixa do ano (ex.: "▾ Ano de serviço 2027"). O ano mais recente abre aberto; os demais começam recolhidos.
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
