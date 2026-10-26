# Semana da visita em uma aba só, com pílulas

Muda só a aparência e a navegação. Nenhum dado salvo, campo, regra de gravação ou permissão muda.

## (01) Menu lateral — seção "Semana da visita"
Hoje são até 8 itens soltos. Passa a ter:

- **Superintendente:** "Resumo da semana", "Comunicação casal", "Programa da visita"
- **Comissão de serviço / anciãos:** "Resumo da semana", "Programa da visita"

```text
+-----------------------------------------+
| SEMANA DA VISITA                        |
|  [=] Resumo da semana                   |
|  [♥] Comunicação casal   (só super)     |
|  [▤] Programa da visita                 |
+-----------------------------------------+
```

## (02)+(03) Tela "Programa da visita" com pílulas

```text
+-----------------------------------------+
| Programa da visita                      |
| Congregação Central · 14–19 out         |
+-----------------------------------------+
| (Anciãos)(Estudos e Revisitas)          |
| (Reuniões)(Refeições)(Transporte)       |
| (Checklist)                             |  <- quebra linha, sem rolar de lado
+-----------------------------------------+
|  conteúdo da pílula escolhida           |
|  (a mesma tela de hoje, sem o título    |
|   repetido)                             |
+-----------------------------------------+
```

- Renomes: "Pastoreios, Recomendações e outros" vira **Anciãos**; "Reuniões e Discursos" vira **Reuniões**.
- Os endereços antigos continuam funcionando (atalhos do painel, lembretes e notificações não quebram); apenas a pílula certa fica marcada.
- A pílula escolhida fica lembrada no aparelho.

## (04) Dias em pílulas nas abas com dias

```text
+-----------------------------------------+
| (Estudos e Revisitas) selecionada       |
+-----------------------------------------+
| (Ter•)(Qua•)(Qui)(Sex•)(Sáb)(Dom)       |
|   ^ dia escolhido em cor primária       |
|   • = dia com itens                     |
+-----------------------------------------+
| TERÇA · 14 out                          |
|  > Manhã · 09:00 · João Silva           |
|  > Tarde · 15:00 · Revisita             |
+-----------------------------------------+
```

- Aplicado em Estudos e Revisitas, Refeições, Transporte e Reuniões (onde houver lista por dia). Anciãos e Checklist ganham pílulas só se a leitura do código confirmar que estão divididos por dia.
- Abre no dia de hoje durante a visita; fora dela, no 1º dia. Segunda só aparece se tiver itens.
- Mesmo desenho das pílulas dos modelos.

## (05) Comissão precisa de "Itinerário" e "Cronograma"? (conferido no código)
- **Cronograma:** para a comissão é só leitura; mostra os eventos do circuito que o superintendente liberou para a congregação (assembleias, reuniões etc.). Também é a tela para onde o app leva quem entra sem painel, e o painel tem atalho "ver tudo" para ela.
- **Itinerário:** para a comissão mostra só as datas das visitas à própria congregação, sem editar.
- **Remover quebra algo?** Sumir só do menu não quebra nada. Apagar as telas quebraria a entrada no app e os atalhos do painel.
- **Recomendação:** tirar os dois do menu da comissão e manter as telas acessíveis pelos atalhos do painel (o cartão "Próximos eventos" já cobre o cronograma). Preciso da sua confirmação — veja a pergunta no fim.

## O que não muda
Banco, permissões, telas de edição, modelos, painel, acesso da esposa, login.

## Detalhes técnicos
- Novo `src/components/visit-week/VisitProgramTabs.tsx` (mesmo padrão de `TemplatesTabs.tsx`): pílulas com `Link` para `/programa-ancioes`, `/escala`, `/reunioes-discursos`, `/refeicoes`, `/transporte`, `/checklist`; inserido no topo das 6 telas. Nova rota `/programa-visita` redireciona para a última pílula usada (localStorage).
- `_app.tsx`: seção Visita reduzida; item "Programa da visita" ativo em qualquer das 6 rotas; "Resumo da semana" passa a aparecer para anciãos.
- **Risco a verificar antes:** `/resumo-semana` hoje redireciona quem não é superintendente e usa `getSuperVisitSummary`. Para a comissão, reaproveitar o resumo que o painel do ancião já carrega (mesmo `VisitSummaryView`) sem mudar permissões; se não houver fonte de dados liberada para anciãos, o item fica só para o super e eu aviso.
- Dias: reaproveitar `DayPills` + helpers de `template-day-pills.ts`, mapeando datas reais da visita; só filtra a renderização, listas continuam montadas.
- i18n pt/en/es para rótulos novos. Validar com `bunx tsgo --noEmit`, `bunx vitest run`, teste do helper "dia inicial" e captura em 393px.
