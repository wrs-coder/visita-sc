# Mini tempo no Safari + melhorias nos Esboços Pessoais

## Parte A — Mini tempo no iPad/iPhone (ajuste anterior)
- Botão "Flutuar" usa o comando próprio da Apple, disparado no mesmo toque (sem espera antes).
- O relógio interno usado para flutuar fica visível ao sistema (não mais 1 pixel invisível).
- Se o Safari ainda recusar: mensagem clara — "O Safari bloqueou a janela. No iPad, use o Slide Over ao lado do seu esboço." (não diz mais "use o Safari").

## Parte B — Pedidos do anexo

### 01. Lembrete "Esqueceu de iniciar?" (modo esboço e tela cheia)
1. **Tempo escolhido sempre em destaque.** Hoje o botão "Iniciar X min" só aparece quando o tempo já foi carregado no momento do alerta; às vezes ele chega depois e o botão some. A causa exata será confirmada primeiro; a correção faz o alerta reler o tempo escolhido quando aparece e sempre mostrá-lo como botão principal.
2. **"Não lembrar novamente" vale só até sair.** Hoje fica gravado para sempre naquele esboço. Passa a valer só enquanto o modo esboço/tela cheia estiver aberto. Ao abrir de novo, o alerta volta após 1 minuto sem iniciar o cronômetro.

```text
┌─────────────────────────────┐
│ ⏱ Esqueceu de iniciar?   ✕ │
│  [ ▶ Iniciar 29 min ]       │ ◄ sempre em destaque
│   5   14   19   44   Outro  │
│  Não lembrar (só agora)     │
└─────────────────────────────┘
```

### 02. Importar Word (.docx): título vira o Tema
- O Tema passa a ser a **primeira frase/linha com texto** do documento (hoje usa o nome do arquivo). Se o documento estiver vazio no início, continua usando o nome do arquivo.

### 03. Anexar imagem/vídeo preenche o Tema
- Ao anexar, se o Tema estiver **vazio**, ele recebe o nome do arquivo (sem a extensão, ex.: "Mapa do território"). Continua editável. Se já houver Tema, nada muda.

### 04. Botão "Limpar" em Esboços recentes
```text
 ESBOÇOS RECENTES          Limpar
 ┌─────────┐ ┌─────────┐
 │ Fé viva │ │ Oração  │
 └─────────┘ └─────────┘
```
- Remove só a lista de recentes deste aparelho; nenhum esboço é apagado.

### 05. Edição sem distrações (Esboços Pessoais)
- Ao editar, somem: título "Esboços Pessoais", a frase explicativa, a escolha "Consideração de campo | Esboço" e "Esboços recentes".
- Topo vira uma barra só (quebra em 2 linhas se faltar espaço).
- "Editar detalhes" abre em janela (popup) com Tema, pasta e demais campos.
- Campo de texto ganha uma **alça** embaixo (igual "Observações do superintendente") para esticar sem limite.

```text
┌─────────────────────────────┐
│ ⬅ Esboços   Modo esboço  ✎ │
│                 ⤢   ⋯   💾 │
├─────────────────────────────┤
│ B I U  • 1.  ⇥  📖          │
│                             │
│ 1. Introdução               │
│    Texto bíblico...         │
│ 2. Primeiro ponto           │
│    ...                      │
│                             │
│            ═══              │ ◄ alça: arraste p/ ampliar
└─────────────────────────────┘

 Popup "Editar detalhes"
┌─────────────────────────────┐
│ Editar detalhes          ✕ │
│ Tema  [Fé viva          ]   │
│ Pasta [Discursos      ▾ ]   │
│ Tipo  Esboço                │
│              [ Concluído ]  │
└─────────────────────────────┘
```

## Minha opinião e riscos
- **01:** bom ganho; risco baixo. O alerta pode aparecer mais vezes — é o que foi pedido.
- **02:** risco de pegar uma linha que não é o título (ex.: "Esboço nº 12"). Mitigação: Tema continua editável e o nome do arquivo fica como reserva.
- **03:** risco baixo; só preenche se estiver vazio, nunca sobrescreve.
- **04:** sem risco para os dados.
- **05:** maior mudança visual. Risco de esconder algo que o usuário procura; mitigação: tudo continua acessível pelo "⋯" e pelo popup, e ao sair da edição a tela volta como hoje. A alça precisa conviver com o teclado do Android (altura medida com teclado fechado, como já é feito).
- **Mini tempo no Safari:** a Apple pode continuar recusando; nesse caso fica a orientação do Slide Over.

## Detalhes técnicos
- Sensor: trocar o `localStorage` de dispensa por um Set em memória por montagem da tela; recalcular `chosenMin` a partir de `useOutlineTimer` no momento do disparo. Remover/ignorar chaves antigas `outline-sensor-dismissed`.
- `docx-import.ts`: título = texto do primeiro parágrafo não vazio (limite 200, fallback nome do arquivo) + teste.
- Anexos: em `onAttachmentsChange`, se `draft.title` vazio e houve item novo de imagem/vídeo, `onPatch("title", nome sem extensão)` + teste do helper.
- `recent-outlines.ts`: `clearRecent()`.
- `OutlinesWorkspace.tsx`: flag de modo edição esconde cabeçalho/recentes; barra compacta; Dialog para detalhes; textarea/editor com `resize: vertical` via alça (mesmo componente das Observações). Sem mudança de banco nem formato salvo.
- Mini tempo: `webkitSetPresentationMode('picture-in-picture')` síncrono no clique, vídeo com tamanho real fora da área visível; nova mensagem i18n.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px.
