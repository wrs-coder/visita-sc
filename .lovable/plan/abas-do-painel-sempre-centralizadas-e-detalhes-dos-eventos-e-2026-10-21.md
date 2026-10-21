# Abas do painel sempre centralizadas e detalhes dos eventos em "Hoje"

## 1. As cinco telas sempre centralizadas (celular)
- Ao deslizar, ou ao tocar numa aba (Hoje, Esboços, Visita, Pastoreio, Amanhã), a tela sempre para inteira e centralizada, com um único toque.
- Se o deslize parar no meio do caminho, o app completa sozinho até a tela mais próxima.
- Ao girar o celular, abrir o teclado ou quando um cartão aumenta ou diminui, a tela atual continua no lugar certo.
- A aba destacada no seletor é sempre a tela que está à vista.

## 2. Detalhes do evento no "Hoje · cronograma"
- Ao tocar num evento da lista, abre uma janela **somente leitura** com todas as informações dele. Hoje, o toque leva para outra página.
- O conteúdo depende do tipo de evento e usa os mesmos títulos dos cartões da aba Visita:
  - **Reunião de campo:** local, território S-13, localização do território, dirigentes auxiliares e oração final.
  - **Estudos e revisitas:** local de encontro, acompanhantes e telefone de contato.
  - **Refeição:** família ou anfitrião, endereço e observações.
  - **Reuniões:** presidente, orações, cânticos, temas, discursos e local.
  - **Transporte:** motorista, horário de saída e descrição.
  - **Evento do cronograma:** título, horário, local, acompanhante e observações. As observações escondidas da esposa continuam escondidas para ela.
- Campos vazios não aparecem. Na janela há um botão **"Abrir página"**, que leva à tela de edição como hoje, e um botão para fechar.
- Vale também para "Amanhã", que usa a mesma lista.
- Nada é editado nem salvo por essa janela.

## O que não muda
- Os dados, a ordem das abas, a aparência dos cartões e o computador, onde as telas continuam empilhadas.

## Detalhes técnicos
- `DashboardPager.tsx`: snap correction on `scrollend`, with a 120 ms debounced scroll fallback for older WebViews. It computes the nearest index and sets `scrollLeft = idx * clientWidth` when it is off by more than 1px. `goTo` scrolls instantly when the target page was just mounted. A `ResizeObserver` on the track re-aligns to `activeIdx` on width change. The restore step runs after mount using two rAFs.
- Timeline: `TimelineItem` gets an optional `details: { label: string; value: string }[]`. Each source in `_app.dashboard.tsx` builds it from week data that is already loaded, so no new queries are needed. The list item `<Link>` becomes a `<button>` that opens a shadcn `Dialog` (`EventDetailsDialog`) with a `<dl>` and a "Abrir página" link to `meta.to`. `buildDayTimeline` tests stay green, and a test confirms that `details` is passed through.
- Validation: tsgo, vitest, and Playwright at 393px: swipe partially, tap each tab, and open a timeline event.
