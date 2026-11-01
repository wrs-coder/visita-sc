# Vídeo com o ancião Wao, botão Tela cheia e painel Nova visita

## 1. Preencher os dados como o ancião "Wao" (para o vídeo)
Sim, é possível. A conta "Wao" (ancião) já existe.

Como farei:
1. Congregação "TESTE", visita de 23 a 28 de fevereiro de 2027 (confirmo que o Wao está ligado a ela).
2. Entro no aplicativo como Wao. O sistema vai pedir a sua aprovação nesse momento.
3. Preencho pela própria tela do ancião, como um ancião real faria: programação, refeições, transporte, reuniões de campo e checklist.
4. Uso nomes e horários de exemplo, com cara realista e sem pessoas reais. Antes de gravar, mostro a lista do que preenchi.

Observações:
- Só entram dados normais da visita. Nada muda na estrutura do aplicativo nem nas permissões.
- Depois do vídeo, posso apagar esses dados de exemplo, se você quiser.

## 2. Tirar "Tela cheia na leitura e no esboço" do Itinerário
Hoje esse botão aparece no cartão "Sobre o aplicativo", no fim de Circuito > Itinerário. Ele também existe em Meu Perfil > Configurações > "Modo imersivo".
- Tiro só o botão do Itinerário. O resto do cartão "Sobre o aplicativo" continua igual.
- O botão em Configurações continua igual, e a escolha que já está salva não muda.

```text
Itinerário (antes)            Itinerário (depois)
┌──────────────────────┐      ┌──────────────────────┐
│ Sobre o aplicativo   │      │ Sobre o aplicativo   │
│ Versão 5.0.x         │      │ Versão 5.0.x         │
│ Tela cheia ...  [●]  │  →   │                      │
└──────────────────────┘      └──────────────────────┘
```

## 3. Painéis "Nova visita" e "Editar visita" grandes demais
O ajuste vale para os dois, porque usam o mesmo painel. Em "Editar visita", os botões fixos são os que já existem lá.
Sua ideia (recolher/expandir) é boa. A minha sugestão junta três coisas, no padrão iOS/One UI:

a) **Botões fixos embaixo:** "Criar visita" e "Cancelar" ficam sempre visíveis, mesmo com a tela pequena ou o teclado aberto.
b) **Rolagem só no meio:** o título fica fixo em cima e somente os campos rolam.
c) **Seção recolhível "Modelos da visita":** junta os 5 modelos (Programação, Checklist, Reuniões de Campo, Reunião e Discurso, Programação Anciãos). Ela começa recolhida quando um Pacote já preencheu tudo e mostra um resumo do tipo "5 de 5 escolhidos". Ela abre sozinha se faltar algum modelo obrigatório.

```text
┌──────────────────────────────┐
│ Nova visita              ✕   │  fixo
├──────────────────────────────┤
│ Congregação     [ ▾ ]        │
│ Início (terça)  [ 03/11 ]    │
│ Fim (domingo)   [ 08/11 ]    │  rola
│ Pacote da visita [ ▾ ]       │
│ ▸ Modelos da visita  5/5 ✓   │  recolhível
├──────────────────────────────┤
│ [        Criar visita      ] │  fixo
│ [          Cancelar        ] │
└──────────────────────────────┘
```
O preenchimento, os pacotes, as validações e o salvamento não mudam. Quando a seção está recolhida, os campos ficam só escondidos, sem perder o que já foi escolhido.

## 4. Painel: escolher um dia e ver aquela semana inteira
Sim, é possível. Hoje as pílulas da Agenda só mostram os dias perto de hoje, e as telas Esboços, Visita e Pastoreio sempre mostram a semana atual.

Como vai ficar:
- Um ícone de calendário ao lado das pílulas abre um seletor de data.
- Ao escolher um dia, o Painel inteiro passa a mostrar aquela semana: a visita que cobre essa data, as pílulas de segunda a domingo e os cartões das 4 telas.
- Aparece uma faixa "Vendo semana de 22/02 – 28/02" com o botão "Voltar para hoje".
- A escolha vale só enquanto o Painel está aberto. Ao reabrir o aplicativo, ele volta para hoje.
- Sem internet, o Painel mostra o que já estiver guardado no aparelho.

```text
┌──────────────────────────────┐
│ Agenda  Esboços Visita Past. │
│ ┌──────────────────────────┐ │
│ │ Vendo semana 22–28/02    │ │
│ │          [Voltar p/ hoje]│ │
│ └──────────────────────────┘ │
│ (Seg 22)(Ter 23)(Qua 24) [📅]│
│ ─ Terça, 23 fev ──────────── │
│  19:30 Reunião – TESTE       │
│  Refeição: Família Silva     │
└──────────────────────────────┘
```

## Detalhes técnicos
- Item 4: em `_app.dashboard.tsx`, novo estado `refIso` (o padrão é `today`). A busca da visita (startOfWeek/endOfWeek, covering/upcoming), `agendaDays` e os cartões semanais passam a usar `refIso` no lugar de `new Date()`/`today`. O destaque "Hoje" continua usando a data real. O seletor de data usa o Calendar do projeto dentro de um Popover. A data escolhida não é salva.
- Item 1: `lovable auth-session --user <id do Wao>` (com a sua aprovação) e preenchimento via Playwright na interface. Sem migrações nem SQL de escrita.
- Item 2: remover o Switch de imersivo de `AppAboutCard.tsx` (usado só em /configuracoes). O `ImmersiveSettingsCard` em /perfil fica como está.
- Item 3: em `_app.configuracoes.tsx`, `DialogContent` vira `flex flex-col max-h-[90dvh]`, com corpo `overflow-y-auto` e rodapé fixo com `pb-[env(safe-area-inset-bottom)]`. Os 5 Selects ficam dentro de `CollapsibleSection`, escondidos sem desmontar. A seção abre sozinha quando falta um modelo obrigatório.
- Atualizar o texto da Ajuda, se ele citar o botão no Itinerário. Validar com tsgo e vitest.
