# Telas mais limpas, calendário e próximas visitas completos

## 1. Ajustes nas telas

### 1.1 Resumo da semana
Sai a linha "TEST • Visão completa da semana de visita". O ícone de exportar sai do topo e vai para dentro do cartão da visita, junto com Partilhar.
```text
┌─────────────────────────────┐
│ Resumo da semana            │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ Visita              [⋯] │ │  ⋯ → Partilhar
│ │ terça, 10 nov —         │ │      Programação geral
│ │ domingo, 15 nov         │ │      Só cronograma
│ └─────────────────────────┘ │
```
O ancião continua vendo só "Programação geral" no mesmo menu.

### 1.2 Comunicação do casal
Saem o botão "Relatório executivo" e a frase "Conversa privada com sua esposa...". As mensagens começam logo abaixo do topo. (A frase da esposa também sai.)

### 1.3 Estudo e Anotações
Sai o ícone 🎓 do topo da tela.

### 1.4 Notas Privadas
Saem "Visíveis apenas para você" e o seletor de congregação. "+ Novo" vai para a mesma linha da lupa e do ⋯.
```text
┌─────────────────────────────┐
│ Notas Privadas              │
├─────────────────────────────┤
│ [Categoria ▾]   🔍  ⋯  [+ Novo]
│ ┌─────────────────────────┐ │
│ │ nota...                 │ │
```
A congregação usada é a mesma ativa do app (a do Início/menu ☰). Nenhuma nota é apagada; notas de outras congregações continuam guardadas e reaparecem ao trocar a congregação ativa.

### 1.5 Esboços Pessoais
Título só no topo (como as outras telas) e sai a frase "Organize considerações de campo...".

### 1.6 Cronograma Semanal
O título passa a mostrar o nome do circuito cadastrado no perfil (ex.: "Circuito SP-12"). Sem circuito cadastrado, continua "Cronograma Semanal".

## 2. Calendário (mês)
Cada dia/semana mostra o que está marcado no itinerário, não só "Visita":
```text
│ Seg  Ter  Qua  Qui  Sex  Sáb  Dom │
│  9   10   11   12   13   14   15  │
│     ▬ Visita: Cong. Central ▬▬▬▬ │
│ 16   17   18   19   20   21   22  │
│ ▬ Assembleia de circuito ▬▬▬▬▬▬ │
│ 23   24   25   26   27   28   29  │
│ ▬ Semana livre / pioneiros ▬▬▬▬ │
```
Visitas mostram a congregação; semanas sem congregação mostram o tipo/título do evento. Tocar abre o detalhe como hoje.

## 3. Botão "Próximas visitas"
A lista passa a incluir também as semanas sem visita com o evento delas, em ordem de data:
```text
┌ Próximas visitas ───────────┐
│ 10/11–15/11  Cong. Central  │
│ 16/11–22/11  Assembleia     │
│ 23/11–29/11  Semana livre   │
│ 30/11–06/12  Cong. Norte    │
└─────────────────────────────┘
```
Funciona sem internet (usa a cópia local, como hoje).

## 4. Leitura da Bíblia — meta "Dias"
Fica só o botão "Continuar" com a porcentagem; o segundo é removido. A ação é a mesma.

## Detalhes técnicos
- resumo-semana: remover subtítulo; mover DropdownMenu para dentro do cartão em VisitSummaryView (prop de ações), juntando Partilhar existente.
- comunicacao-casal: remover subtitleSuper/subtitleWife e executiveReport da tela (chaves i18n ficam se usadas em outros lugares: refeicoes, escala, dashboard, FieldMeetings).
- _app.estudo-pessoal / _app.tsx: remover GraduationCap só nessa tela.
- _app.notas: remover subtítulo e seletor; usar congregação ativa; reorganizar a linha de ações.
- Esboços: remover subtitle 1603; título via barra superior.
- Cronograma: título = profiles.circuit (fallback cronograma.title).
- Calendário mensal (CircuitHeader ?view=month) e UpcomingVisitsDialog: unir visits + itinerary_weeks (readWithMirror), rótulo por tipo/título.
- Leitura: localizar o "Continuar" duplicado no cartão da meta Dias e manter o com porcentagem.
- Atualizar Ajuda (help-content) e pt/en/es; rodar testes e typecheck; teste visual nas telas alteradas.
