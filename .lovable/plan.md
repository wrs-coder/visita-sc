# Controle de tempo — refinamento 2

## Causa dos "..." não funcionarem (confirmada)
A tela do Controle de tempo fica numa camada acima dos menus. Os menus abrem, mas ficam escondidos atrás dela. Correção: fazer os menus desta tela abrirem por cima (vale para o "..." do topo e de cada parte).

## Mockup

```text
┌─────────────────────────────────┐
│ ✕                           ⋯   │
│ Imite aqueles que confiaram     │  <- tema completo, quebra linha
│ em Jeová!                       │
│ 📅 Sáb, 14 nov · Salão de Assem.│  <- data e local
│ 🕘 09:40 – 15:50                │  <- início e fim
│ ● Programa 4 min atrasado       │  <- verde/âmbar/cinza
├─────────────────────────────────┤
│ MANHÃ                           │
│ ▸ Cântico 12 · Oração      (3)  │  <- partes sem orador, recolhidas
│ ┌─────────────────────────────┐ │
│ │ 10:15 · Discurso 2       ⋯  │ │
│ │ João Silva · Cong. Centro   │ │
│ │ 🔔 +2 min        ┌───────┐  │ │
│ │                  │ 14:32 │  │ │  1 toque: inicia/encerra
│ │ ▓▓▓▓▓▓░░░░        └───────┘  │ │  2 toques: "Zerar este tempo?"
│ └─────────────────────────────┘ │
│ ...                             │
│ Oração final · Pedro        ⋯   │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ⏸ Pausar    │ ■ Concluir    │ │  <- só aqui, no fim da lista
│ └─────────────────────────────┘ │
└─────────────────────────────────┘

 ⋯ do topo            ⋯ da parte
┌──────────────────┐ ┌──────────────┐
│ ✓ Regressivo     │ │ ✎ Editar     │
│   Cronômetro     │ │ ↺ Reiniciar  │
│ ⤓ Relatório exec.│ │ ⏱ Alterar    │
│ ⧉ Sobrepor apps  │ │   tempo      │
│ ↺ Zerar tudo     │ └──────────────┘
└──────────────────┘
```

## O que muda
1. **Topo organizado**: tema completo (sem cortar), depois data e local, depois início–fim, depois "Programa X min adiantado / atrasado / no horário". O seletor Regressivo/Cronômetro sai do topo e vai para o "...", junto com "Exportar relatório executivo".
2. **Todos os "..." funcionando** (correção acima).
3. **"..." de cada parte**: Editar (abre a edição normal da parte no evento: tema, orador, tempo previsto), Reiniciar (zera e deixa a parte pronta), Alterar tempo (corrige o tempo gasto).
4. **Dois toques no relógio grande**: pergunta "Zerar o tempo desta parte?" (Cancelar / Zerar). Um toque continua iniciando/encerrando.
5. **Botões flutuantes Pausar/Encerrar removidos**. Viram um cartão no fim da lista, após a Oração final: "Pausar/Continuar" e "Concluir evento" (abre o relatório).
6. **Partes sem orador** (cânticos, música, vídeos etc.) agrupadas numa linha recolhível; já abrem recolhidas. Se uma delas estiver rodando, aparece aberta.

## Relatório executivo
O PDF atual ganha um bloco inicial de resumo: horário previsto × real de início e fim, desvio total do programa, nº de partes no tempo/estouradas, maior atraso e maior adiantamento por orador; depois a tabela por parte que já existe.

## Integridade
- Nada no banco/servidor muda; tempos continuam só no aparelho, com o mesmo formato salvo.
- Lógica de série de discursos, pílula do sino, bolha sobre apps e modos regressivo/cronômetro ficam iguais.
- Testes novos: zerar uma parte não afeta as outras; agrupamento de partes sem orador; resumo executivo (valores de desvio). Rodar typecheck e todos os testes.

## Detalhes técnicos
- `EventTimerFocus.tsx`: `DropdownMenuContent` com `z-[70]`; novo cabeçalho; footer flutuante removido e virado item final da lista; duplo toque via detecção de 2 cliques <300 ms (atrasando o toque simples) + AlertDialog `z-[70]`; grupos recolhíveis de linhas consecutivas sem `elder`/orador, estado de recolhimento só em memória.
- "Editar" fecha o foco e abre o editor da parte via callback do componente pai do evento.
- `timer-report-pdf.ts`: seção de resumo executivo calculada a partir de `summarize()`.
