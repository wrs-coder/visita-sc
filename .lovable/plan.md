# Ajustes: Semana da visita, deslizar para sincronizar e Semanas sem visita

Resposta curta: os três pedidos são viáveis e produtivos. Nenhum exige mudar o banco de dados.

## 1. Semana da visita (esposa e anciãos visitantes)

- Sai o título "Visita e data"; a congregação e as datas ficam numa linha discreta acima das pílulas.
- Ao abrir, a pílula do dia de hoje já vem selecionada. Se a semana tem congregação agendada, a programação aparece direto, sem toque extra. Fora da semana da visita, abre no primeiro dia.

```text
+-------------------------------+
| Cong. Centro · 27 out – 1 nov |
| [Ter] [Qua] (Qui) [Sex] [Sáb] |  <- Qui = hoje, já ativa
|-------------------------------|
| 09:00  Saída de campo         |
| 19:30  Reunião do meio        |
+-------------------------------+
```

## 2. Esboços do SC: deslizar para sincronizar

- Em "Esboços da semana", "Considerações da semana" e pastas com sincronização ligada, deslizar um esboço para a esquerda revela um botão verde "Sincronizar". Deslizar até o fim já sincroniza.
- Mostra "Enviado" ao terminar; sem internet, fica na fila e sobe sozinho quando a conexão voltar (o mesmo envio já usado pelo botão de sincronizar).
- Pastas locais não mostram o gesto.

```text
| Esboço 12 – Amor leal   |[⟳ Sincronizar]|
|                <- deslize               |
```

## 3. Itinerário: Semanas sem visita

1. **Seleção da semana igual a "Criar visita":** ao escolher o primeiro dia, o último dia daquela semana é marcado sozinho (pode ser ajustado).
2. **Sugestões automáticas:** para cada mês que já tem pelo menos uma visita marcada, lista as semanas daquele mês sem visita e sem semana já criada. Aparecem em cinza tracejado, misturadas em ordem de data com as já criadas, com um "+" para criar rapidamente.
3. **Tipo "Outro":** além de "Semana de pioneiro" e "Semana livre", a opção "Outro" abre um campo para escrever o nome (ex.: "Assembleia", "Férias").
4. **Semanas livres somem sozinhas:** a partir da primeira segunda-feira depois da data final, deixam de aparecer na lista. Elas ficam ocultas, não apagadas.

```text
+-------------------------------+
| Semanas sem visita       [+]  |
| OUTUBRO                       |
| ☀ Pioneiro   6–12 out     🗑  |
| ┄ Sugestão  20–26 out  [+ Criar]
| NOVEMBRO                      |
| ✎ Assembleia 10–16 nov    🗑  |
| ┄ Sugestão  24–30 nov  [+ Criar]
+-------------------------------+
```

## O que não muda
- Programação, pílulas e permissões das outras telas.
- Envio de sincronização dos esboços (só ganha um atalho).
- Semanas de pioneiro e "Outro" continuam visíveis após terminar.

## Detalhes técnicos
- Semana da visita: escolha do dia inicial via `useVisitDay` com padrão = hoje se dentro do intervalo; remover cabeçalho nas rotas `visitante.*` e na aba da esposa.
- Deslize: componente `SwipeToSync` com pointer events (sem nova lib), chamando a função de push já existente para o esboço; ignora pastas sem sync.
- `ItineraryWeeks.tsx`: helper puro `suggestFreeWeeks(visits, weeks)` (semanas seg–dom dos meses com visita, excluindo sobreposições) + `isExpiredFreeWeek(week, today)`; ambos com testes. "Outro" grava o texto em `week_type` (coluna já é texto livre); se houver restrição no banco, grava `other` e o nome em `notes`.
- Seleção do intervalo reutiliza a mesma lógica de "Criar visita".
- i18n pt/en/es; validar com `tsgo` e `vitest`.
