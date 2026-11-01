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

## Detalhes técnicos
- Item 1: `lovable auth-session --user <id do Wao>` (com a sua aprovação) e preenchimento via Playwright na interface. Sem migrações nem SQL de escrita.
- Item 2: remover o Switch de imersivo de `AppAboutCard.tsx` (usado só em /configuracoes). O `ImmersiveSettingsCard` em /perfil fica como está.
- Item 3: em `_app.configuracoes.tsx`, `DialogContent` vira `flex flex-col max-h-[90dvh]`, com corpo `overflow-y-auto` e rodapé fixo com `pb-[env(safe-area-inset-bottom)]`. Os 5 Selects ficam dentro de `CollapsibleSection`, escondidos sem desmontar. A seção abre sozinha quando falta um modelo obrigatório.
- Atualizar o texto da Ajuda, se ele citar o botão no Itinerário. Validar com tsgo e vitest.
