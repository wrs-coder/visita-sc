# Pauta: "Informações adicionais dos anciãos" com respostas individuais

## O que muda (em palavras simples)

1. O cartão passa a se chamar **"Informações adicionais dos anciãos"** em todo o app, no PDF e nos modelos (os já salvos mudam o nome sozinhos).
2. Hoje todos os anciãos escrevem no **mesmo** campo de texto. Agora o cartão vira uma **caixa de respostas**: cada ancião toca em **"+ Inserir informações sobre o assunto"** e ganha o **seu próprio cartão** para preencher (com o nome dele, texto, anexos e as perguntas).
3. O SC pode colocar, opcionalmente:
   - **Checklist** – perguntas de marcar (ex.: "Visitou os irmãos inativos?") → o ancião dá o check.
   - **Perguntas com resposta** – pergunta + campo de texto para o ancião responder.
4. Visualização:
   - **Fora da tela cheia**: só um **balão** "3 respostas". Tocando, abre uma janela com as respostas em **carrossel** (deslizar para o lado).
   - **Tela cheia**: o carrossel aparece direto dentro do cartão; deslizar troca só a resposta, o resto da pauta não se mexe.
   - **PDF exportado**: o cartão vai para uma **folha separada** no final, com uma resposta por bloco (nome, checklist ✓/☐, perguntas e respostas, texto).

## Mockups

### SC montando o cartão
```text
┌─────────────────────────────────┐
│ Informações adicionais dos    ⋮ │
│ anciãos            Quem: Todos  │
│ ─────────────────────────────── │
│ CHECKLIST (opcional)       [●○] │
│  ☐ Visitou os inativos?      ✕  │
│  ☐ Pioneiros foram ajudados? ✕  │
│  + Adicionar item               │
│ PERGUNTAS (opcional)       [●○] │
│  1. Qual a maior necessidade    │
│     da congregação?          ✕  │
│  + Adicionar pergunta           │
│ ─────────────────────────────── │
│  💬 3 respostas            ›    │
└─────────────────────────────────┘
```

### Ancião na pauta (fora da tela cheia)
```text
┌─────────────────────────────────┐
│ 4) Encorajamentos        15 min │
│ ┌─────────────────────────────┐ │
│ │ Informações adicionais dos  │ │
│ │ anciãos                     │ │
│ │  💬 3 respostas        ›    │ │
│ │ [ + Inserir informações     │ │
│ │     sobre o assunto ]       │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Formulário do ancião (folha que sobe de baixo)
```text
┌─────────────────────────────────┐
│ ▬▬▬                             │
│ Minhas informações       Salvar │
│ Seu nome  [ João Silva        ] │
│ ☑ Visitou os inativos?          │
│ ☐ Pioneiros foram ajudados?     │
│ 1. Qual a maior necessidade?    │
│ [ Mais saídas no sábado...    ] │
│ Informações                     │
│ [ texto livre ............... ] │
│ 📎 Anexos        🗑 Apagar minha│
└─────────────────────────────────┘
```

### Janela de respostas (carrossel) – igual na tela cheia
```text
┌─────────────────────────────────┐
│ Respostas  (2 de 3)          ✕  │
│ ┌─────────────────────────────┐ │
│ │ João Silva · 18/11 20:14    │ │
│ │ ☑ Visitou os inativos?      │ │
│ │ ☐ Pioneiros ajudados?       │ │
│ │ 1. Qual a maior necessidade?│ │
│ │    Mais saídas no sábado... │ │
│ │ Texto livre...              │ │
│ └─────────────────────────────┘ │
│  ‹        ○ ● ○        ›        │
└─────────────────────────────────┘
```

## Regras
- Cada ancião só edita/apaga **a sua** resposta; o SC pode editar ou apagar qualquer uma.
- Todos os anciãos com acesso ao cartão **veem** todas as respostas (como hoje).
- Prazo de preenchimento e "Ocultar dos anciãos" continuam valendo.
- O texto antigo escrito no campo único das pautas existentes vira automaticamente a **primeira resposta** ("Resposta anterior"), sem perder nada.
- Esposa continua sem acesso à pauta.

## Detalhes técnicos
- `agenda.ts`: `CARD_TYPE_LABEL.eldersInfo = "Informações adicionais dos anciãos"`; título padrão antigo "Informações dos anciãos" renomeado na normalização. `AgendaCard` ganha `checklist: {id,text}[]`, `questions: {id,text}[]`, `showChecklist`, `showQuestions`, `responses: AgendaElderResponse[]` (`id, authorKey, name, checks: Record<id,bool>, answers: Record<id,string>, html, attachments, updatedAt`). Normalização com limites (30 respostas, 20 itens). Legado: `html` não vazio em eldersInfo → resposta inicial.
- Identidade: anciãos pelo código não têm conta, então cada aparelho gera um `authorKey` aleatório guardado no localStorage (usuários com conta usam o id do usuário). `mergeAgenda` para não-SC: só aceita inserir/alterar/apagar respostas cujo `authorKey` seja o do remetente; estrutura (checklist/perguntas) só o SC altera. `saveAgenda` recebe o `authorKey` junto.
- UI: `ElderAgendaView.tsx` (editor SC de checklist/perguntas, balão + botão), novo `ElderInfoResponses.tsx` (folha do formulário + diálogo carrossel com CSS scroll-snap, mesmo padrão do DashboardPager), `ElderAgendaFullscreen.tsx` mostra o carrossel embutido.
- PDF (`agenda-pdf.ts`, 3 estilos): cartões eldersInfo saem do fluxo e são renderizados em página nova ao final, com título do tópico, uma resposta por bloco.
- Testes: rename, migração do texto antigo, ancião não edita resposta de outro, ancião não altera perguntas, SC edita tudo, PDF com página extra. Versão 6.0.0 mantida; nota no "O que há de novo" (SC e anciãos) e na Ajuda.
