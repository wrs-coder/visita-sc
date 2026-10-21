# Análise do Visita SC: sugestões de fluidez, visual, bateria e usabilidade

Este é um documento só de sugestões. Nada será alterado sem a sua aprovação, item por item. Todas elas seguem as diretrizes do instructions.md: Superintendente sem congregação fixa, rascunho local com "Salvar dados" explícito e banco de dados intocado.

## 1. Fluidez e velocidade
1. **Dividir as duas telas gigantes.** O Dashboard e os Esboços têm cerca de 100 mil caracteres cada. Separar as partes (cards, editor, tela cheia) e carregar cada uma só quando for aberta. Resultado: o app abre mais rápido e trava menos ao digitar.
2. **Deixar as telas mais usadas guardadas no aparelho** depois da primeira abertura, para que abram na hora, mesmo com internet fraca. Ocupa um pouco mais de memória interna.
3. **Listas longas** (esboços, pastas, lixeira, histórico) desenhando só o que aparece na tela. Rolagem lisa mesmo com centenas de itens.
4. **Mostrar os dados salvos primeiro e atualizar em silêncio.** Hoje algumas telas mostram "carregando". O ideal é exibir o espelho local na hora.
5. **Bíblia EPUB pré-indexada** após a importação (índice de livros e capítulos salvo), para que o balão de versículos abra instantaneamente.

## 2. Bateria
1. **Reduzir os efeitos de vidro (desfoque).** Existem cerca de 12 telas com esse efeito, que pesa na bateria e foi a causa da piscada azul no iPad. Trocar por fundo sólido levemente transparente.
2. **Unificar os relógios internos.** Hoje há 7 contadores independentes que rodam a cada segundo. Usar um só e pausar tudo quando o app estiver em segundo plano.
3. **Sincronização inteligente.** Manter a de manhã e a de tarde, mas pular quando a bateria estiver baixa ou em modo economia, e nunca rodar com o app fechado.
4. **Tema escuro verdadeiro (preto puro) opcional.** Economiza bastante em telas OLED, que são a maioria dos celulares atuais.
5. **Manter a tela acesa só com o cronômetro correndo**, como já acontece. Revisar se nenhuma outra tela segura a tela acesa.

## 3. Visual premium
1. **Hierarquia mais clara no Dashboard:** um cartão de destaque "Hoje" no topo (congregação, próxima reunião, cronômetro) e o resto mais discreto.
2. **Espaçamentos e cantos padronizados**, com uma escala única para que todas as telas pareçam do mesmo app.
3. **Transições suaves e curtas** ao abrir cartões, recolher tópicos e trocar de aba, desligadas automaticamente quando o aparelho pede "reduzir movimento".
4. **Estados vazios ilustrados** (sem esboços, sem visitas), com um botão de ação claro em vez de tela em branco.
5. **Ícone, tela de abertura e cores do cronômetro alinhados** à paleta da Onda 6.8. Hoje o "Término" usa cores fixas fora do padrão.

## 4. Usabilidade
1. **Barra inferior fixa no celular** com as 4 áreas mais usadas (Hoje, Esboços, Itinerário, Perfil), alcançáveis com o polegar.
2. **Busca global** (esboços, versículos, congregações) por um único botão.
3. **Desfazer em vez de confirmar:** ao apagar algo, mostrar "Apagado, desfazer" por alguns segundos, já que existe lixeira.
4. **Indicador claro de sincronização** (salvo no aparelho / enviado / pendente), sempre visível e discreto.
5. **Botões maiores no modo tela cheia** para usar em pé, durante a reunião.
6. **Atalhos no tablet com teclado:** Esc fecha, Espaço inicia ou pausa o cronômetro.

## 5. Tamanho e memória (aceitável, como você permitiu)
- Guardar fontes e ícones dentro do app (abre sem internet e mais rápido): cerca de 1 a 2 MB a mais.
- Cache maior de telas e imagens no aparelho: alguns MB de memória interna.

## Ordem recomendada (maior ganho com menor risco)
1. Bateria 1 e 2 (rápidos e seguros).
2. Fluidez 4 e 3.
3. Usabilidade 3 e 4.
4. Visual 1 e 3.
5. Dividir as telas gigantes (maior ganho, feito por etapas com testes).

Cada etapa seria feita isoladamente, validada com a verificação do código e os testes, sem tocar no banco, no login, na Bíblia ou na sincronização.
