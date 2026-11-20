# Visualizar anexos da pauta dentro do app (sem baixar)

## Resposta curta
Sim, é viável. Hoje a foto já abre numa janela dentro do app, mas o **PDF** é entregue como arquivo (vai para Downloads / "Salvar em") e obriga a sair do app. Vamos trocar isso por um **visualizador interno**: tocar → abrir → ler → fechar ou minimizar, sem gravar nada na pasta do aparelho.

## Como vai ficar

```text
 Pauta (anciãos)                 Visualizador (tela cheia)
┌──────────────────────────┐    ┌──────────────────────────┐
│ Fontes de matéria        │    │ ✕   Carta filial.pdf   ▁ │
│ ┌──────────────────────┐ │    │──────────────────────────│
│ │ 📄 Carta filial.pdf  │─┼──► │ ┌──────────────────────┐ │
│ └──────────────────────┘ │    │ │                      │ │
│ ┌──────────────────────┐ │    │ │   Página 1           │ │
│ │ 🖼  Foto do salão     │ │    │ │   (rolagem vertical, │ │
│ └──────────────────────┘ │    │ │    pinça p/ zoom)    │ │
│                          │    │ └──────────────────────┘ │
│                          │    │ ┌──────────────────────┐ │
│                          │    │ │   Página 2           │ │
└──────────────────────────┘    │──────────────────────────│
                                │   −   100%   +    2 / 5  │
                                └──────────────────────────┘

 Minimizado (▁): volta para a pauta com uma pílula flutuante
┌──────────────────────────┐
│ Pauta ...                │
│                          │
│        ┌───────────────┐ │
│        │📄 Carta… ↗  ✕ │ │   ← toca para reabrir na mesma página
│        └───────────────┘ │
└──────────────────────────┘
```

- **✕ Fechar**: some o documento e a memória é liberada.
- **▁ Minimizar**: guarda só enquanto o app está aberto (em memória), para consultar de novo durante a reunião sem recarregar.
- Fotos usam o mesmo visualizador (tela cheia, zoom com pinça), no lugar da janelinha atual.
- Estilo iOS/One UI: barra superior translúcida, respeita as barras do Android (botões não ficam escondidos), funciona claro/escuro.

## O que "não salvar nada" significa
- Nada vai para Downloads, Galeria ou "Arquivos".
- Para os **anciãos**, o anexo é carregado da nuvem só na hora e fica apenas na memória do app; ao fechar, é descartado. Consequência: sem internet o anexo enviado não abre (o texto da pauta continua offline normalmente).
- Para o **superintendente**, os anexos que ele mesmo adicionou continuam guardados dentro do app como hoje (é onde eles moram antes de "Enviar").
- Um botão discreto "Compartilhar" fica no menu ⋯ do visualizador para quem realmente quiser salvar — opcional; posso retirar se preferir.

## Detalhes técnicos
- Novo `src/components/elder-agenda/AttachmentViewer.tsx`: diálogo em tela cheia; PDF renderizado com `pdfjs-dist` (já instalado), carregado sob demanda (import dinâmico, worker via `?url`), páginas em canvas com renderização preguiçosa; zoom − / + e pinça; contador de páginas; `safe-area` no topo/rodapé.
- Estado de minimizado num pequeno store do módulo (blob + página atual), pílula flutuante renderizada pela tela da pauta; `URL.revokeObjectURL` e descarte ao fechar.
- `AgendaAttachments.tsx`: `open()` deixa de chamar `saveBlob` para PDF; `blobOf()` só chama `keepLocal` quando o usuário é o editor (SC), nunca para anciãos.
- Sem mudanças no banco, nos links assinados (10 min), no PDF exportado da pauta nem no formato dos dados.
- Testes: regra "visualização de ancião não grava cópia local" (blobOf com editable=false não chama keepLocal). Rodar `bunx tsc --noEmit` e suíte completa; conferir no navegador abrindo um PDF de exemplo.

---

# Parte 2 — Superintendente insere respostas por um ancião

Para anciãos sem acesso ao app: o SC recebe a informação (conversa, mensagem) e lança no cartão "Informações adicionais dos anciãos".

```text
 Cartão (visão do SC)
┌──────────────────────────┐
│ Informações adicionais   │
│ dos anciãos     💬 3     │
│ [+ Inserir informações]  │   (já existe para o ancião)
│ [+ Inserir por um ancião]│   ← novo, só para o SC
└──────────────────────────┘

 Folha "Resposta de um ancião"
┌──────────────────────────┐
│ Nome do ancião (opcional)│
│ [ Irmão Silva          ] │
│ Checklist                │
│ Pergunta 1  [Sim|Não|Em parte]
│ Perguntas                │
│ [ resposta...          ] │
│ Informações              │
│ [ texto...             ] │
│        [ Salvar ]        │
└──────────────────────────┘
 No carrossel aparece: "Irmão Silva · inserido pelo SC"
```

- O SC pode inserir quantas respostas quiser (uma por ancião), editar e apagar.
- Aparecem para todos os anciãos no carrossel, na tela cheia e na folha separada do PDF, igual às outras.
- Um ancião que depois entrar no app não consegue editar a resposta lançada pelo SC (fica com o SC).

## Compatibilidade com a versão da Play Store
- Nada muda no formato salvo: a resposta do SC usa o mesmo modelo das respostas existentes, com uma marca extra opcional ("inserido pelo SC") que versões antigas simplesmente ignoram.
- O visualizador de anexos é só tela nova: a versão instalada continua abrindo/baixando como hoje até ser atualizada.
- Sem mudanças no banco, nas funções do servidor já usadas pela versão instalada, nem no PDF.

## Detalhes técnicos (Parte 2)
- Respostas do SC recebem `authorKey` próprio `sc:<id aleatório>` (nunca coincide com o hash de um aparelho) e campo opcional `bySc: true`; normalização aceita ausência.
- `ElderInfoResponses.tsx`: botão "Inserir por um ancião" quando `isSc && canWrite`; reutiliza o mesmo formulário; `canChange` já permite ao SC editar todas.
- Servidor: o merge de papel SC já grava `responses` inteiro; confirmar em `mergeAgenda` que, para SC, respostas `sc:` são preservadas e que o merge de ancião (`mergeResponses`) nunca remove respostas de outros autores (já é assim).
- Testes: SC adiciona resposta e ela sobrevive a um salvamento de ancião; ancião não consegue alterar resposta `sc:`; payload sem `bySc` continua válido.
