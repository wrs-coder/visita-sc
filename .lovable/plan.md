## Missão 1 — Reordenar campos nas subabas de Modelos > Reuniões e Discursos

Arquivo: `src/routes/_app.modelo-reunioes-discursos.tsx` (somente reorganização do JSX — sem alterar tipos, schema, persistência, traduções, nem lógica `isSuper`/readOnly).

**Subaba "Fim de Semana"** — ordem nova:
1. Cântico Inicial (`weekend_opening_song`)
2. Discurso Público (`weekend_public_talk_theme` + hint editor/readOnly)
3. Discurso Final (bloco existente de `weekend_themes` com botão "Adicionar tema")
4. Cântico Final (`weekend_closing_song`)
5. Observações (`weekend_observations`, Textarea)

Os dois cânticos deixam de ficar na mesma linha grid 2-col e passam a renderizar empilhados nas posições 1 e 4.

**Subaba "Meio de Semana"** — ordem nova:
1. Presidente da Reunião (`midweek.chairman`)
2. Tema: Discurso de Serviço (`midweek.service_talk_theme`)
3. Cântico Final (`midweek.final_song`)
4. Oração Final (`midweek.closing_prayer`)
5. Observações (`midweek.observations`)

**Subaba "Anciãos e Servos Ministeriais"** — ordem nova:
1. Observações (`elders.observations`)
2. Oração Inicial (`elders.opening_prayer`)
3. Tema (`elders.theme`)
4. Oração Final (`elders.closing_prayer`)

A subaba "Pioneiros" não é mencionada → permanece intacta.

## Missão 2 — Itinerário: "Início (Terça)" baseado na última visita global

Arquivo: `src/routes/_app.configuracoes.tsx`, função que prepara o formulário de Nova Visita (atualmente no `useEffect` perto da linha 169).

Trocar o cálculo da `baseDate`:
- **Antes:** filtra `visits` por `congId` e usa o maior `end_date`/`start_date` daquela congregação.
- **Depois:** ignora a congregação selecionada e usa a maior `end_date` (com fallback para `start_date`) entre **todas** as visitas carregadas em `visits`. Se não houver visitas, mantém o fallback atual (hoje).

A função `tuesdayAfter(base)` continua a mesma: avança para a próxima terça-feira estritamente após `base`. O auto-snap do `end_date` (domingo seguinte, +5 dias) permanece intacto.

A edição de visita existente (`startEdit`) não é alterada — continua usando as datas salvas.

## Segurança e integridade

- Nenhuma migração de banco; nenhuma alteração em RLS, server functions, exportação, modo offline, sw.js, queries persistidas ou i18n (as chaves de tradução já existem para todos os labels reorganizados).
- Apenas reordenação JSX + troca da fonte de `baseDate` — risco de regressão mínimo.
- Restrições de edição (`readOnly={!isSuper}`) e `maxLength={4000}` nas Textareas são preservadas em todos os campos movidos, garantindo que o superintendente continue podendo inserir dados sem bloqueios.
- Validação manual após implementar: abrir cada subaba, confirmar a nova ordem, salvar como superintendente e como ancião (read-only), e criar uma nova visita conferindo a terça calculada.
