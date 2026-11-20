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
