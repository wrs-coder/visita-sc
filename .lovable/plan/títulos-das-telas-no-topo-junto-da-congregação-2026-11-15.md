# Títulos das telas no topo, junto da congregação

## Resposta curta
Não é necessário repetir o título dentro da tela. No celular, o nome da tela pode subir para a barra azul do topo, como no iPhone e no One UI. Hoje essa barra mostra o logo e o nome da congregação. Assim, cada tela ganha cerca de 50 a 60 px de espaço útil.

## Como fica (celular)

Antes:
```text
┌─────────────────────────────┐
│ ☰ 🔷 Cong. Central   ⟳ ? 🗑 ⎋│  <- barra azul
├─────────────────────────────┤
│ Refeições                   │  <- título grande ocupando espaço
│ [botões / filtros]          │
│ ┌─────────────────────────┐ │
│ │ conteúdo                │ │
└─────────────────────────────┘
```

Depois:
```text
┌─────────────────────────────┐
│ ☰ Refeições          ⟳ ? 🗑 ⎋│  <- só o nome da tela
├─────────────────────────────┤
│ [botões / filtros]          │  <- o conteúdo começa logo aqui
│ ┌─────────────────────────┐ │
│ │ conteúdo                │ │
│ │                         │ │
└─────────────────────────────┘
```

- A barra continua com a mesma altura e mostra só o nome da tela.
- A congregação sai do topo. Ela continua aparecendo no menu ☰ (no alto do menu, com "Ativa: …") e no Início, onde você escolhe a congregação.
- No **Início (Dashboard)** nada muda: continua o logo + congregação e a saudação.
- Os botões que ficam ao lado do título (por exemplo "+ Novo" e "⋯" em Notas Privadas) continuam no mesmo lugar. Só o texto grande sai.
- **iPhone e celulares Android**: funcionam igual (é o mesmo app).
- **Tablets e computador**: lá não existe a barra azul, porque o menu fica fixo à esquerda. Por isso entra uma barra fina no topo da área de conteúdo, com o nome da tela. O título grande de dentro da tela sai também.

```text
Tablet / computador
┌──────────┬──────────────────────────────┐
│ MENU     │ Refeições                    │  <- barra fina (título)
│ Circuito │──────────────────────────────│
│ Ativa:   │ [botões / filtros]           │
│ Central  │ ┌──────────────────────────┐ │
│ • Início │ │ conteúdo                 │ │
│ • Notas  │ └──────────────────────────┘ │
└──────────┴──────────────────────────────┘
```
No tablet e no computador, a congregação continua no alto do menu lateral, como hoje.
- Leitores de tela continuam lendo o título da página.

## Telas incluídas
Notas Privadas, Estudo e Anotações, Perfil, Ajuda, Lixeira, Refeições, Transporte, Escala, Comunicação do casal, Reuniões e discursos, Resumo da semana, Relatório, Programa dos anciãos, Pacotes da visita, Congregações, Itinerário, Cronograma e as telas de modelos (programação, reuniões de campo, discursos, checklist).

## Fica de fora
Telas de entrada, cadastro, convite (/c/…), termos, políticas e a tela do relógio. Elas não têm a barra azul.

## Detalhes técnicos
- Novo `src/lib/page-titles.ts`: mapa rota → chave de tradução já existente (ex.: `/refeicoes` → `meals.title`), com teste que confere se todas as chaves existem em pt/en/es.
- `_app.tsx` (header mobile): quando a rota tem título, mostra só o título (`text-base font-semibold`, truncado) no lugar do logo + congregação. Sem título (Dashboard), fica como hoje. O `SidebarHeader` do menu continua mostrando a congregação ativa.
- Tablet/computador (md+): barra fina `sticky top-0` (h-12, `bg-background/90` com blur e borda inferior) no topo do `<main>`, mostrando o título da rota. Some no Início e nas telas de foco (focus-chrome).
- Em cada tela da lista, o `<h1>` recebe `sr-only` em todos os tamanhos: continua para leitores de tela, e a linha de ações ao lado continua visível.
- Não muda dados, links nem a lógica das telas. Atualizar a Ajuda se ela citar títulos dentro das telas.
