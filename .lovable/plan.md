# Corrigir: Tema automático ao anexar imagem/vídeo

## Por que não funcionou
A regra foi feita e ligada, mas usa o **"Tema/Título" que você digita na janela de anexar**, e não o nome do arquivo. Essa janela abre com o campo vazio e o botão "Adicionar" só libera depois que você escreve algo. Então o nome do arquivo nunca é usado. Os testes automáticos não pegaram isso porque testaram a regra isolada, sem a janela.

## O que vou fazer
1. Ao escolher a foto ou o vídeo, o campo "Tema/Título" da janela já vem preenchido com o nome do arquivo, sem a extensão (ex.: "Mapa do território.jpg" vira "Mapa do território"). Você pode mudar antes de adicionar.
2. Ao adicionar, se o Tema do esboço estiver vazio, ele recebe esse nome. Se já tiver Tema, nada muda.
3. Se você já tiver escrito um título na janela, trocar de arquivo não apaga o que escreveu.

```text
┌──────────────────────────────┐
│ Anexar imagem                │
│ [📷 Mapa do território.jpg ] │
│ Tema/Título                  │
│ [ Mapa do território      ]  │ ← já vem preenchido
│ [Cancelar]      [Adicionar]  │
└──────────────────────────────┘
```

## O que mais conferi dos planos
Conferi no código, item por item:
- Lembrete "Esqueceu de iniciar?" e "Não lembrar novamente": feitos
- Tema a partir da primeira linha do Word: feito
- Botão "Limpar" em Esboços recentes: feito
- Edição sem distrações, alça de altura e "⬅ Esboços": feitos
- Mini tempo flutuante no Safari: feito
- Importar oradores, incluindo o PDF do programa oficial: feito
- Barra de ferramentas e layout manual das cartas: feitos
- Relógio espelhado que continua com "Sem sinal": feito

Só o item do Tema ao anexar estava com falha.

## Detalhes técnicos
- `AttachmentAddDialog.tsx`: no onChange do arquivo, se `title` estiver vazio, `setTitle(fileBaseName(file.name).slice(0,60))`.
- Teste novo: escolher o arquivo preenche o título, e `titleFromNewAttachment` devolve esse nome quando o Tema está vazio.
- Sem mudança de banco de dados nem de versão.
