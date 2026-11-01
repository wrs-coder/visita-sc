# Novidades por perfil + Ajuda para o Corpo de Anciãos

## 1. "O que há de novo" com etiqueta de perfil

Cada grupo de novidades ganha uma etiqueta colorida dizendo a quem afeta. Quem abre a janela vê primeiro o que é do seu perfil; o resto fica em "Outros perfis" (recolhido).

```text
+-------------------------------+
|  O que há de novo   v5.1.0  X |
|-------------------------------|
|  [Para você]                  |
|  Agenda com mais detalhes     |
|  (SC) (Anciãos)               |
|  • Temas abaixo da reunião    |
|  • "Mais detalhes" expande    |
|                               |
|  Lembretes de leitura         |
|  (SC) (Esposa)                |
|  • Escolha o horário          |
|-------------------------------|
|  > Outros perfis (2)          |
|-------------------------------|
|        [   Entendi   ]        |
+-------------------------------+
```

- Etiquetas: SC (azul), Anciãos (verde), Esposa (rosa), Todos (cinza) — cores dos tokens existentes.
- Grupos antigos sem etiqueta aparecem como "Todos" (nada quebra).
- O histórico em Configurações → Ver novidades segue igual, só com as etiquetas.

## 2. Ajuda no acesso do Corpo de Anciãos

Sim, recomendo: o ancião usa o app poucas vezes por ano e esquece onde fica cada coisa.

- O ícone "?" aparece no topo também para o ancião (hoje já existe no topo do SC).
- A tela Ajuda mostra só os tópicos daquele perfil; o ancião não vê Circuito, Grandes Eventos nem Notas Privadas.
- Tópicos do ancião (novos, curtos):
  1. Painel inicial (agenda da semana da visita)
  2. Programa da visita (refeições, saídas de campo, transporte, reuniões)
  3. Perguntas do SC, Pastoreio, Encorajamento, Recomendações, Assuntos locais
  4. Resumo da semana e PDF
  5. Entrada e segurança (PIN/digital, uso sem internet)
  6. Perguntas frequentes
- "Abrir esta tela" leva só a telas que o ancião realmente acessa.

```text
+-------------------------------+
| <  Ajuda               🔍     |
|-------------------------------|
|  Corpo de Anciãos             |
|  [📅] Painel inicial        > |
|  [🗓] Programa da visita    > |
|  [👥] Perguntas e pastoreio > |
|  [📄] Resumo e PDF          > |
|  [🔒] Entrada e segurança   > |
|  [?]  Perguntas frequentes  > |
+-------------------------------+
```

## Detalhes técnicos

- `release-notes.ts`: `ReleaseSection` ganha `audience?: ("super"|"elder"|"wife"|"all")[]`; ausente = all. Marcar as seções da versão atual. `WhatsNewDialog` lê o perfil atual (role / acesso por código) e ordena + recolhe.
- `help-content.ts`: `HelpTopic` ganha `audience`; tópicos atuais = super; novos tópicos do ancião. `_app.ajuda.tsx` filtra por role. Busca respeita o filtro.
- `_app.tsx`: liberar o ícone de Ajuda para role elder (sem tocar nas outras telas).
- Testes: estender `help-content.test.ts` (rotas do ancião existem e estão permitidas ao ancião; chaves de rótulo existem) e `release-notes.test.ts` (audience válido; filtro por perfil).
- Sem mudança de banco, sem bump de versão, `WHATS_NEW_AUTO_SHOW` continua false.
