# Correção: Painel de Cabiri mostrando só "Quarta 04/11" e "Nada registrado"

## O que aconteceu (confirmado no banco)
Hoje às 16:14 (UTC) o app criou sozinho uma segunda visita para Cabiri, chamada "Programação geral", que dura só 1 dia (04/11) e está vazia.
A sua visita verdadeira (03/11 a 08/11, com refeições e saídas de campo) continua intacta, nenhum dado foi perdido.

Como as duas visitas cobrem hoje, o Painel escolhe a que começa mais tarde, ou seja, a vazia. Por isso só aparece um dia e nada registrado.

Por que foi criada: duas partes do app criam essa "Programação geral" quando acham que a congregação não tem nenhuma visita. Uma delas (a tela Reuniões/Discursos) faz isso quando a consulta ao servidor **falha** (internet lenta ou cortada pelo novo limite de tempo), confundindo "falhou" com "não existe".

## Correção
1. **Remover a visita fantasma** de Cabiri (a de 04/11, sem nenhum dado). Sua visita real volta a aparecer com todos os dias.
2. **Nunca criar visita quando a consulta falhar** ou estiver sem internet, nas duas partes que criam a "Programação geral".
3. **Se duas visitas cobrirem o mesmo dia, preferir a visita real** (com mais dias / com modelo aplicado) em vez da "Programação geral".
4. Teste automático para os itens 2 e 3.

Sem mudança visual, sem mudança na estrutura do banco, sem mudar versão.

## Detalhes técnicos
- Dado: `DELETE FROM visits WHERE id='76b98c49-4d0c-4ba3-a13b-0afd370c6788'` após confirmar zero linhas filhas.
- `src/routes/_app.reunioes-discursos.tsx` `useEnsureVisitForSuper`: só inserir se `error == null` e `data.length === 0`; também consultar o espelho local primeiro.
- `src/hooks/use-active-visit.ts`: só criar placeholder com leitura remota bem-sucedida; na escolha de "current", ordenar pondo "Programação geral"/visitas de 1 dia depois das visitas reais.
- `src/routes/_app.dashboard.tsx`: mesma regra de preferência ao escolher a visita da semana.
