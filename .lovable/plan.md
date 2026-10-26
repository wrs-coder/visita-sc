# Aba do Circuito e Notas privadas mais limpas

## (01) Juntar Cronograma, Itinerário e Congregações: é seguro?

Sim, é seguro, desde que as telas atuais continuem existindo por dentro. Hoje são três itens no menu: "Cronograma", "Itinerário" (dentro de Configurações) e "Congregações". A mudança é só de navegação e visual. Os dados, as permissões e as funções ficam iguais, e os links antigos (lembretes, atalhos, Painel) continuam abrindo a tela certa.

No menu, os três itens viram um só, com o nome do circuito digitado em "Meu perfil" (exemplo: "Circuito SC-12"). Sem nome, aparece "Meu circuito".

```text
┌───────────────────────────────┐
│ ☰  Circuito SC-12        [📅] │  <- ícone de calendário grande, cor de destaque
│                               │
│  ( Itinerário ) ( Congregações )│ <- pílulas, como em Modelos
│ ───────────────────────────── │
│  Semana 03–09 nov             │
│  Cong. Central   · Visita     │
│  Semana 10–16 nov             │
│  Pioneiros (sem congregação)  │
│  ...                          │
└───────────────────────────────┘
```

Tocar no 📅 abre o calendário do mês, no estilo do Google Agenda:

```text
┌───────────────────────────────┐
│ ‹  Novembro 2026  ›   [Hoje]  │
│ D  S  T  Q  Q  S  S           │
│          ▓▓▓▓▓▓▓▓▓▓▓ Visita    │ <- faixa colorida da visita
│ 2  3  4• 5  6  7• 8           │ <- ponto = evento no dia
│ 9 10 11 12 13 14 15           │
│ ...                           │
│ ───────────────────────────── │
│ Qua, 5 nov                    │
│  10:30  Pastoreio – Central   │
│  19:30  Reunião meio de semana│
│                               │
│                   [ + Novo ]  │ <- mesmo botão e formulário de hoje
└───────────────────────────────┘
```

- O calendário mostra todos os eventos do cronograma e também as visitas, como faixas que atravessam os dias.
- Tocar num dia lista os eventos daquele dia. Tocar num evento abre a edição que já existe.
- "+ Novo evento" continua com o mesmo formulário e as mesmas regras.
- A pílula escolhida fica guardada no aparelho. Só o superintendente vê essa aba. Os anciãos não são afetados.

## (02) Notas privadas com menos poluição

```text
┌───────────────────────────────┐
│ 🔒 Notas privadas             │
│ [Cong. Central ▾] [+ Novo] [🔍]│ <- tudo numa linha só
│ (Livres)(Pastoreio)(...)      │ <- pílulas de categoria
│                               │
│  Nota ...                     │
└───────────────────────────────┘

Tocar em [+ Novo]:            Tocar em [🔍]:
┌─────────────────────┐       ┌───────────────────────────┐
│ Nova nota (Livres)  │       │ [Título ou conteúdo…] [x] │
│ Exportar PDF        │       │ De [__/__]  Até [__/__]   │
│ Enviar por WhatsApp │       └───────────────────────────┘
│ Selecionar notas    │
└─────────────────────┘
```

- **Linha única:** seletor de congregação (só para esta aba), botão "+ Novo" e lupa.
- **+ Novo:** um menu com "Nova nota" (da categoria aberta), "Exportar PDF", "Enviar por WhatsApp" e "Selecionar todas / Limpar seleção". O card grande de exportar e o botão largo "Nova nota" saem da tela.
- **Lupa:** a busca e as datas só aparecem ao tocar na lupa. O "x" fecha e limpa a busca.
- Quando há notas selecionadas, aparece uma pequena barra "N selecionadas · Exportar · Limpar", que some quando a seleção é desfeita.
- Nada muda nas notas salvas, na sincronização nem na lixeira.

## Detalhes técnicos
- Nova rota `_app.circuito.tsx` com `validateSearch({ tab: "itinerary" | "congregations" })`. Ela reutiliza o conteúdo de Itinerário (extraído de `_app.configuracoes.tsx`, sem mudar a lógica) e de `_app.congregacoes.tsx` (o corpo vira um componente). Os componentes ficam montados (com `hidden`) para preservar os rascunhos.
- `/cronograma` continua existindo e ganha a visualização de mês (componente novo `MonthCalendar`, com grade de 7 colunas e faixas das visitas a partir das datas de `visits`). O 📅 navega para lá. `/congregacoes` redireciona para `/circuito?tab=congregations`. Itinerário em Configurações redireciona para `/circuito?tab=itinerary`.
- Sidebar (`_app.tsx`) e `CommandPalette` com um só item: título `profile.circuit`, ativo nas três rotas.
- `_app.notas.tsx`: cabeçalho reescrito, `DropdownMenu` para "+ Novo", estado `searchOpen`. `exportPdf`, `shareWhatsapp`, `add` e os filtros continuam iguais.
- i18n pt/en/es com os novos rótulos. Testes para a montagem da grade do mês (faixa da visita e pontos dos eventos). Validação com `tsgo` e `vitest`.
