# Circuito e Itinerário: congregações unificadas, Grandes Eventos e recolher/expandir

## 1. Circuito: pílulas "Congregações" e "Grandes Eventos"

```text
+-------------------------------------+
| Circuito IBE-01                 📅  |
| [ Itinerário ][ Circuito ]          |
| ( Congregações )( Grandes Eventos ) |
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

- A pílula "Anciãos do circuito" sai. Os anciãos de cada congregação passam a aparecer dentro dela.
- Por privacidade, cada congregação começa recolhida, mostrando só o nome e quantos anciãos tem. Tocando no nome, ela se abre com o código, a senha, os botões e os anciãos.
- O aparelho lembra quais congregações ficaram abertas.

## 2. Grandes Eventos (assembleias e reuniões especiais)

Os Grandes Eventos aparecem como pílula em "Circuito" e também como atalho no menu lateral. Os dois levam ao mesmo lugar.

```text
App do SC
+-------------------------------------+
| ( Congregações )(•Grandes Eventos ) |
|       [ ⤒ Importar .etim ][ + Novo ]|
| ▾ Assembleia de circuito  14/03     |
|   Confirmadas 5/8 · Recusadas 1     |
|   09:40 Nº12 Discurso A    15 min   |
|     João Silva    ✓ Confirmado      |
|   10:00 Simpósio parte 1   10 min   |
|     Pedro Lima    ✕ Recusado  [ i ] |  <- vê o motivo
|   11:00 Nº27 Discurso B    20 min   |
|     [ Escolher orador ▾ ]           |
|   11:30 Nº30 Discurso C    30 min   |
|     Mário Reis    ○ Aguardando      |
|     [ ⧉ Copiar convite ][ ↻ Novo PIN]|
| ▸ Reunião especial  22/05     1/1   |
+-------------------------------------+
```

- **Importar .etim:** você escolhe o arquivo do programa, e o app lê as partes (horário, tempo, tema, número do esboço, instruções, tipo e simpósio) e monta o evento. Também é possível criar um evento à mão.
- **Orador:** você digita o nome ou escolhe um ancião já cadastrado.
- **Copiar convite:** o app cria um link pessoal e um PIN de 6 números e copia uma mensagem pronta para WhatsApp ou e-mail. O botão "Novo PIN" troca o código e cancela o anterior.
- **Status ao vivo:** cada parte mostra Aguardando, Confirmado (com data e hora) ou Recusado (com o motivo). O status muda sozinho quando o orador responde.

```text
Página do orador (sem login)
+-----------------------------+    +-----------------------------+
|  Visita SC · Designação     |    | Assembleia · 14/03          |
|  Digite o PIN que você      |    | Parte Nº 27 · 11:00 · 20min |
|  recebeu na mensagem:       | -> | Tema: "Discurso B"          |
|      [ _ _ _ _ _ _ ]        |    | Instruções: ...             |
|       [ Continuar ]         |    | [ Confirmar ] [ Recusar ]   |
|                             |    | Recusar: "Explique o motivo |
|                             |    |  da recusa" (obrigatório)   |
+-----------------------------+    +-----------------------------+
```

- A página só mostra os dados depois que o PIN certo é digitado. Com 5 erros, o link é bloqueado até você gerar um novo PIN.
- O orador vê apenas a parte dele, sem nomes de outros oradores e sem dados das congregações.
- Depois de responder, aparece "Obrigado". Se ele precisar mudar a resposta, você gera um novo PIN.

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

- Cada mês de visitas agendadas pode ser recolhido ou expandido. O mês atual começa aberto e os outros começam fechados.
- O bloco "Semanas sem visita" e cada mês dentro dele também podem ser recolhidos ou expandidos. O aparelho lembra o que ficou aberto.

## O que não muda
Continuam iguais: códigos de convite, senhas, ativação de congregações, cadastro de anciãos, visitas, semanas sem visita (inclusive a limpeza automática das semanas livres vencidas) e o cronograma. O que fica recolhido só é escondido na tela, então nada do que você estiver digitando se perde.

## Detalhes técnicos
- `_app.congregacoes.tsx`: a seção passa a ser `"congregations" | "events"`, e o valor antigo `"elders"` salvo no aparelho passa a abrir `"congregations"`. Cada card vira um `Collapsible`, com o cabeçalho mostrando o nome e o número de anciãos. O corpo reúne o conteúdo atual e os anciãos de `elders.filter(congregation_id)`. O estado de aberto/fechado fica em localStorage, e o conteúdo é escondido com `hidden`, sem ser desmontado.
- Banco: só tabelas novas, nenhuma das existentes muda. `circuit_big_events` (`superintendent_id`, `name`, `event_type`, `event_date`, `location`, `notes`) e `circuit_big_event_parts` (`event_id`, `sort_order`, `part_time`, `duration_min`, `theme`, `outline_number`, `instructions`, `part_type_id`, `part_type_label`, `symposium`, `talk_includes`, `speaker_name`, `status pending|confirmed|declined`, `responded_at`, `decline_reason`, `token uuid unique`, `pin_hash`, `pin_attempts`, `email_sent`). GRANT para authenticated e service_role, RLS só para o superintendente dono e nenhum acesso anon. Realtime em `circuit_big_event_parts`, filtrado pela RLS do dono.
- Página pública `src/routes/confirmar.$token.tsx` (`noindex`). As server functions `getAssignment({token,pin})` e `respondAssignment({token,pin,action,reason})` validam com zod, comparam o PIN por hash SHA-256 (com o token como sal) e contam as tentativas. Só depois disso usam o cliente admin, carregado dentro do handler, e devolvem apenas os campos daquela parte. Na recusa o motivo é obrigatório, com até 1000 caracteres.
- `src/lib/etim-import.ts`: um parser tolerante. Aceita um array ou um objeto com `circuitEventPart`, valida cada parte, limita o tamanho do arquivo e ignora campos desconhecidos. Como nenhum `.etim` de exemplo veio junto, ele segue os campos descritos no anexo.
- `src/components/circuit/BigEvents.tsx` cuida da lista, importação, escolha de orador, cópia do convite e atualização ao vivo. O PIN em claro aparece só no momento da cópia e nunca é salvo. A rota `/grandes-eventos` reaproveita esse componente para o atalho do menu.
- `_app.configuracoes.tsx` (meses das visitas) e `ItineraryWeeks.tsx` (bloco e meses): cabeçalhos que recolhem e expandem, com o estado em localStorage. O mês atual começa aberto.
- i18n em pt/en/es e regra no `AGENTS.md`. Testes para: mês atual aberto por padrão, parser `.etim`, hash e validação do PIN, e bloqueio após 5 tentativas. Validação com `bunx tsgo --noEmit` e `bunx vitest run`.
