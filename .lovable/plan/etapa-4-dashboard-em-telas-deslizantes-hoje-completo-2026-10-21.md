# Etapa 4 — Dashboard em telas deslizantes + "Hoje" completo

## Opinião
A ideia é coerente e útil, com uma condição: as telas deslizantes não podem esconder informação. Hoje é preciso rolar bastante para achar Refeições ou Transporte. Com 4 telas e um seletor, você chega lá com um toque. O conteúdo de cada cartão continua igual.
Cuidados:
- O deslizar para o lado não pode atrapalhar a rolagem vertical nem o arrastar de itens. O deslize só começa com um gesto claramente horizontal.
- No computador e no tablet deitado, as telas largas mostram tudo como hoje, em lista. O modo deslizante vale só para o celular. Essa parte fica em aberto para você decidir.
- O app guarda a última tela aberta no aparelho.

## O que muda

### 1. Seletor rápido
Fica logo abaixo do cartão "Congregação ativa", com 4 abas curtas: **Hoje · Visita · Pastoreio · Amanhã**. A aba atual fica destacada. Um toque leva direto à tela escolhida, e deslizar o dedo também troca a aba.

### 2. As quatro telas
```text
Tela 1 Hoje      : Hoje (cronograma completo do dia) | Esboços e Notas | Reuniões da semana
Tela 2 Visita    : Reunião de Campo | Estudos e Revisitas | Refeições | Transporte  (semana inteira)
Tela 3 Pastoreio : Pastoreiem o Rebanho de Deus | Checklist da Congregação
Tela 4 Amanhã    : Cronograma do dia seguinte | Recados da esposa
```
**Sem informação repetida:** o que é do dia aparece só no "Hoje". Os cartões de Reuniões, Reunião de Campo, Estudos e Revisitas, Refeições e Transporte passam a mostrar a semana inteira da visita, agrupada por dia, com todos os detalhes de cada evento (horário, local, dirigente, pessoas, endereço e observações, conforme o caso). O dia de hoje aparece marcado na lista, para você se situar.

Os cartões que hoje só aparecem para o superintendente continuam assim. Se uma tela ficar vazia para algum perfil, ela some do seletor.

### 3. "Hoje" mais completo
Junta numa única linha do tempo, ordenada por horário, tudo o que está marcado para o dia:
- os eventos do cronograma (como hoje);
- Reunião de Campo, Estudos e Revisitas, Refeições, Reuniões e Transporte.
Cada item mostra um ícone e a cor da sua área. Os itens sem horário ficam no fim, em "Sem horário". Tocar num item abre a tela daquela área. Nada é criado nem alterado: o "Hoje" só lê o que já existe. Continuam valendo a regra de ocultar as observações da esposa e a regra do dia da semana.

## Riscos e proteções
- Não mexe no banco, no login, na sincronização nem nos dados offline. É uma mudança só no visual e na organização da tela.
- Os cartões são os mesmos componentes de hoje, só reagrupados. Por isso o risco de quebrar alguma função é baixo.
- As telas fora de vista continuam carregadas, então nada que você esteja digitando se perde ao trocar de tela.
- Antes de concluir: verificação do código, todos os testes e teste no celular (393 px) deslizando, tocando no seletor e rolando cada tela.

## Detalhes técnicos
- Carrossel com CSS scroll-snap horizontal (`snap-x snap-mandatory`, `overscroll-behavior-x: contain`), sem biblioteca nova. O seletor usa scrollIntoView e IntersectionObserver para marcar a aba ativa. A última aba fica salva em localStorage e é lida após a hidratação.
- A partir de `md`, o layout vertical atual é mantido.
- Agregador puro `buildTodayTimeline()` em src/lib, com testes de ordenação, itens sem horário e filtro do dia. Ele lê os dados já buscados no Dashboard e nas consultas em cache.
- Rótulos em pt, en e es. Cores somente por tokens de src/styles.css.
- A memória "Layout atual mantido" será atualizada para registrar este novo arranjo aprovado.
