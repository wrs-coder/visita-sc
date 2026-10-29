# Circuito e Itinerário: congregações unificadas, Eventos do Circuito e recolher/expandir

Observação: o anexo sobre "Eventos do circuito" não chegou nesta conversa. O plano abaixo usa os campos que você escolheu (nome, tipo, data, local, partes com orador e tempo, observações). Se o anexo pedir algo diferente (por exemplo, o ancião confirmar pelo app), envie de novo que eu ajusto só essa parte.

## 1. Circuito: pílulas "Congregações" e "Eventos do Circuito"

```text
+-------------------------------------+
| Circuito IBE-01                 📅  |
| [ Itinerário ][ Circuito ]          |
| ( Congregações )( Eventos do Circ.) |
+-------------------------------------+
| ▸ Central                    3 anc. |   <- recolhida: só o nome
| ▾ Jardim Paulista            2 anc. |   <- expandida
|   Código de convite  AB12CD   [⧉]   |
|   Senha da aba Anciãos   ••••  [👁] |
|   Ativa  [on]          [ ⋯ ]        |
|   Anciãos cadastrados               |
|    • João Silva — Coordenador       |
|    • Pedro Lima — Secretário        |
| ▸ Vila Nova                  4 anc. |
|            [ + Nova congregação ]   |
+-------------------------------------+
```

- A pílula "Anciãos do circuito" deixa de existir. A lista de anciãos aparece dentro de cada congregação.
- Por privacidade, cada congregação começa recolhida, mostrando só o nome e o número de anciãos. Tocar no nome expande e mostra o código, a senha, os botões e os anciãos.
- O aparelho lembra quais congregações ficaram abertas. Os dados não mudam.

## 2. Nova pílula "Eventos do Circuito"

```text
+-------------------------------------+
| ( Congregações )(•Eventos do Circ.) |
|                        [ + Evento ] |
| ▾ Assembleia de circuito            |
|   Sáb 14/03 · Salão de Assembleias  |
|   Partes                 2/3 conf.  |
|   ✓ 09:40 Discurso A  João  15 min  |
|   ✓ 10:00 Simpósio    Pedro 10 min  |
|   ○ 11:00 Discurso B  Mário 20 min  |  <- tocar alterna confirmado
|   Obs.: chegar 30 min antes         |
|   [ + Parte ]          [ ⋯ ]        |
| ▸ Reunião especial — 22/05     1/1  |
+-------------------------------------+
```

- O evento tem nome, tipo (Assembleia, Reunião especial, Outro), data, local e observações.
- Cada parte tem horário, tema, orador (você digita ou escolhe um ancião cadastrado), tempo em minutos e um marcador "confirmado".
- Os eventos ficam recolhidos, mostrando só o nome, a data e o contador de confirmações. Os passados vão para "Anteriores", que também começa recolhido.
- Só você vê e edita esses eventos. Eles ficam guardados na sua conta e aparecem em todos os seus aparelhos.

## 3. Itinerário: recolher e expandir

```text
+-------------------------------------+
| Visitas agendadas                   |
| ▾ Março 2027                 2 vis. |
|   Central        02/03 — 07/03      |
|   Vila Nova      16/03 — 21/03      |
| ▸ Abril 2027                 1 vis. |
|                                     |
| ▾ Semanas sem visita            3   |
|   ▸ Março 2027                  2   |
|   ▸ Abril 2027                  1   |
+-------------------------------------+
```

- Cada mês das visitas agendadas recolhe e expande. O mês atual começa aberto e os outros começam fechados.
- O bloco "Semanas sem visita" e cada mês dentro dele também recolhem e expandem.
- O aparelho lembra o que ficou aberto. As visitas e as semanas não mudam.

## O que não muda
Os códigos de convite, as senhas, a ativação de congregações, o cadastro de anciãos e as visitas continuam iguais. As semanas sem visita, inclusive a limpeza automática das semanas livres vencidas, também continuam iguais. O que está escondido fica apenas oculto na tela, então campos que você estiver editando não se perdem.

## Detalhes técnicos
- `_app.congregacoes.tsx`: o tipo da seção passa a ser `"congregations" | "events"`, e o valor salvo antigo `"elders"` vira `"congregations"`. Cada card de congregação usa um `Collapsible` com o cabeçalho (nome e número de anciãos de `elders.filter(congregation_id)`). O corpo mostra o conteúdo atual do card e o grupo de anciãos que hoje está na seção de anciãos. O estado aberto fica em localStorage (`visita-sc:circuit-open`), e o corpo é escondido com `hidden`, sem desmontar.
- Nova tabela `circuit_speaker_events` com `id`, `superintendent_id`, `name`, `event_type`, `event_date`, `location`, `notes`, `parts jsonb` (lista de `{id, time, theme, speaker, minutes, confirmed}`) e timestamps. Recebe GRANT para authenticated/service_role, RLS só para o dono (`superintendent_id = auth.uid()` e role superintendent) e o trigger `touch_updated_at`. Não toca em nenhuma tabela existente.
- Novo componente `src/components/circuit/CircuitSpeakerEvents.tsx` com o CRUD pelo cliente do navegador (RLS), leitura com `readFnWithMirrorSafe` para funcionar sem internet e salvamento com espera de 600 ms ao editar as partes.
- `_app.configuracoes.tsx` (meses das visitas) e `ItineraryWeeks.tsx` (bloco e meses): cabeçalhos colapsáveis com estado em localStorage (`itin.open.*`). O mês atual começa aberto.
- Textos em i18n pt/en/es, regra nova no `AGENTS.md` e testes para a regra "mês atual aberto por padrão" e para o contador de confirmações. A validação usa `bunx tsgo --noEmit` e `bunx vitest run`.
