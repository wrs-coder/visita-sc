# Modelos e Programa da visita — visual mais limpo

Só muda a organização visual. O superintendente continua podendo editar qualquer campo. Nenhum dado existente é apagado.

## Padrão novo (igual em todos os modelos)

```text
┌─────────────────────────────┐
│ ▸ Observações do superint.  │  ← recolhe/expande (fechado se vazio)
├─────────────────────────────┤
│ Campos do superintendente   │
│ [ Tema...               ]   │
│ [ Horário ]  [ Dia ]        │
├─────────────────────────────┤
│ ▾ A ser preenchido pelos    │  ← cinza discreto, recolhe/expande
│   Anciãos            ● 2/3  │    bolinha mostra quantos preenchidos
│   [ Local              ]    │
│   [ Oração inicial     ]    │
└─────────────────────────────┘
```

## Modelos Visitas

1. Programação › Refeições: Anfitrião e Local vão para "A ser preenchido pelos Anciãos".
2. Programação › Transporte: Nome do motorista, Telefone e Observações vão para o bloco dos anciãos.
3. Programação › Estudos e Revisitas: Local de encontro, Telefone de contato e Acompanhante vão para o bloco dos anciãos.
4. Campo:
   - "Mais detalhes" passa a se chamar "A ser preenchido pelos Anciãos".
   - "Observações do superintendente" fica logo abaixo de Modalidade e pode ser recolhida.
   - Nº território S-13, Localização, Dirigentes auxiliares e Oração final ganham caixinhas "Solicitar aos anciãos":
```text
│ Solicitar aos anciãos:      │
│ ☑ Nº território S-13        │
│ ☐ Localização do território │
│ ☑ Dirigentes auxiliares     │
│ ☐ Oração final              │
```
   Os anciãos só veem os itens marcados. Nos modelos antigos tudo aparece marcado, então nada muda até o superintendente desmarcar.
5. Reuniões › Meio de semana, nesta ordem: Observações do superintendente (recolhível) › Tema do discurso de serviço › Cântico final › bloco dos anciãos (Presidente, Oração final).
6. Reuniões › Fim de semana, nesta ordem: Observações do superintendente › Cântico inicial › Discurso público › Discurso final › Cântico final.
7. Reuniões › Pioneiros e 8. Anciãos e Servos, nesta ordem: Observações do superintendente › Tema › Dia da semana › Horário › bloco dos anciãos (Local, Oração inicial, Oração final).

## Programa da visita (anciãos e superintendente)

1. Campo: ao lado de "Local da reunião de campo" e de "Dirigentes auxiliares" aparece o botão "Copiar para…". Ele abre a lista de dias, você marca quais quer e toca em Copiar:
```text
┌ Copiar "Salão do Reino" ────┐
│ ☑ Ter 10 · Manhã            │
│ ☐ Ter 10 · Tarde            │
│ ☑ Qua 11 · Manhã            │
│      [Cancelar] [Copiar]    │
└─────────────────────────────┘
```
   Se um dia já tiver algo escrito, o app pergunta antes de substituir.
2. Assuntos locais:
   - Botão [ + Adicionar ] para os anciãos criarem um assunto novo. Eles podem criar e editar, mas não apagar.
   - O título de cada cartão mostra o tema digitado. Sem tema, aparece "Assunto 1", "Assunto 2"…
3. Barra "Congregação selecionada / Descartar / Salvar dados": antes de mudar qualquer coisa, vou investigar por que ela não aparece no celular e te explicar. Só mexo depois da sua aprovação.

## Mais sugestões (opcionais, não incluídas)
- No Programa da visita, um selo "Faltam 3 campos" no topo de cada aba para os anciãos.
- Usar o mesmo bloco cinza dos anciãos também no Programa da visita, para os dois lados verem a mesma coisa.

## Detalhes técnicos
- Alteração no banco autorizada: uma coluna nova e opcional `requested_fields text[]` em `field_meeting_template_items` e `field_meetings`. Valor vazio quer dizer que tudo aparece, então celulares antigos continuam funcionando. Ao aplicar o modelo na visita, essa informação é copiada junto. Não muda nenhuma regra de acesso.
- Vou criar um componente comum `EldersFillSection`, reaproveitando `InfoDisclosure`/`collapsible-blocks` e guardando aberto/fechado só no aparelho.
- Arquivos: `_app.modelos.tsx`, `_app.modelo-reunioes-de-campo.tsx`, `_app.modelo-reunioes-discursos.tsx`, as telas do programa (campo e assuntos locais em `_app.programa-ancioes.tsx`), além de pt.json e das outras línguas.
- Para o + Adicionar, vou inserir em `elder_local_matters` com `source='manual'`. Antes, vou conferir que a regra de acesso já permite que os anciãos criem. Se não permitir, paro e te aviso.
- Não muda a versão. Ao final, rodo testes e typecheck e acrescento testes para "itens solicitados" e "copiar para dias".
