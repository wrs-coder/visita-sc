# Plano — Leitura independente, ajustes da carta PDF, importar programa (RTF) e fluidez

## 1. Leitura da Bíblia: progresso independente

Hoje cada aba já lê os próprios dados (Pessoal, Família, Reunião), mas a mesma barra aparece nas três. A causa de "progresso igual" ainda não foi confirmada.

Passos:
- Primeiro, reproduzir o problema no aparelho: marcar capítulos em Pessoal e ver se Família muda. Se mudar, corrigir onde a marcação (incluindo "Dias" e destaques) grava na aba errada.
- Pessoal e Família: cada uma com sua barra, sua meta e seu "Continuar".
- Reunião: sem barra de progresso e sem lista "Livros da Bíblia". Ficam só "Leitura da semana", "Para comentar" e anotações.

```text
 Pessoal / Família               Reunião
┌──────────────────────────┐   ┌──────────────────────────┐
│ [Pessoal][Família][Reun.]│   │ [Pessoal][Família][Reun.]│
│ ▸ Meta de leitura        │   │ ▾ Leitura da semana      │
│ 34% ━━━━━─────── ▶ Gên 5 │   │   Isaías 40-41  [Ler ▶]  │
│ 402 de 1.189 capítulos   │   │   [Ajustar esta semana]  │
│ ▸ Livros da Bíblia (66)  │   │ ▾ ★ Para comentar (3)    │
│ ▸ Pontos altos e notas   │   │ ▸ Pontos altos e notas   │
└──────────────────────────┘   └──────────────────────────┘
```

## 2. Carta em PDF

- **Parágrafos:** texto justificado, com recuo de cerca de 12 mm na primeira linha. A última linha de cada parágrafo fica alinhada à esquerda.
- **Uma fonte só:** todo o texto usa a mesma fonte com serifa, exceto o cabeçalho e a assinatura. O itálico fica só no campo de observações (nota do ensaio). A saudação e o fecho deixam de ser itálicos.
- **Uma página:** antes de salvar, o app mede a altura da carta. Se passar de uma página, primeiro reduz um pouco os espaços e a fonte (até um limite). Se ainda não couber, avisa: "A carta de <orador> passou de 1 página — encurte os lembretes no modelo". A carta continua sendo gerada.
- **Sem texto sobreposto:** o título de cada faixa ("INFORMAÇÕES PARA VOCÊ") tem a altura reservada antes de desenhar o conteúdo. Uma faixa nunca fica dividida entre duas páginas.
- **Caixa "INFORMAÇÕES & LEMBRETES" mais compacta:** menos margem interna, rótulo e valor na mesma linha (por exemplo "Parte: Discurso nº 13 · 10:15") e linhas mais próximas.

```text
┌──────────────────────────────┐
│      CABEÇALHO (inalterado)  │
│             Cidade, 31/10/26 │
│ Prezado irmão Fulano,        │
│     Temos a alegria de convi-│
│ dar o irmão para ... justifi-│
│ cado com recuo.              │
│ ┌ INFORMAÇÕES & LEMBRETES ──┐│
│ │Parte: Nº 13 · 10:15      ││
│ │Tema: ...  Link: Clique aqui││
│ └───────────────────────────┘│
│ ▌INFORMAÇÕES PARA VOCÊ       │
│ ▌texto abaixo, sem sobrepor  │
│ Ensaio: (itálico)            │
│        Assinatura (cursiva)  │
└──────────── 1 página ────────┘
```

## 3. Importar programa: usar o RTF

Dos dois arquivos enviados, o **.rtf** é o mais confiável. Ele traz em texto as linhas com horário e título (9:40 Música, 10:00 "Encontre a mais plena alegria...", 1:20 Música da tarde, e assim por diante), o título do tema e as seções Manhã/Tarde.

- O PDF perde a ordem do texto ao ser lido.
- O JWPUB é um arquivo fechado da JW Library. Pela regra do projeto, ele não é usado.

Como vai funcionar:
- O RTF é lido no próprio aparelho. Os horários da tarde (1:20 e seguintes) viram 13:20.
- Músicas, cânticos, anúncios e oração viram partes sem orador. Os discursos viram partes a designar.
- O resultado entra na mesma tela de revisão usada hoje para .csv, .etim e .json. O tema do programa vira o nome do evento.

## 4. Lentidão entre telas: parecer

É comum em um app com tantas funções, mas dá para melhorar. A causa principal ainda não foi medida. Proposta:
1. Medir primeiro: tempo de abertura de cada tela no celular e tamanho dos arquivos carregados por tela.
2. Carregar só quando a tela abrir as partes pesadas (Bíblia, leitor EPUB, geração de PDF/Word, importadores, Grandes Eventos), como já é feito com o editor de esboços.
3. Pré-carregar a próxima tela provável quando o aparelho estiver ocioso, ou quando o dedo encostar no botão.
4. Manter os dados já carregados ao voltar para uma tela, para não buscar tudo de novo.
5. Listas longas (capítulos, eventos) desenhadas aos poucos, e menos re-desenhos ao digitar.
6. Animação de troca de tela curta, no estilo iOS/One UI, para a resposta parecer imediata.

Vou executar os itens 1 e 2 e informar os ganhos medidos. Os outros entram depois, conforme a medição.

## Detalhes técnicos
- `BibleReadingTab.tsx`: barra e lista ocultas quando `track === "meeting"`. Conferir se `getReading`/`putReading` estão em todos os caminhos de gravação (Dias, marcar lido, leitor).
- `letter-render.ts`: um passo de medição (layout sem desenhar) calcula a altura total. Escala de compactação 1.0→0.9. `onOverflow` é devolvido para `BigEvents.tsx` mostrar um toast. As faixas são medidas por inteiro antes de `ensure`. Fontes F.serif e F.serifBold no corpo, e serifItalic só em rehearsalNote.
- Novo `rtf-program-import.ts` (remove códigos RTF, decodifica `\uN?`, regex de horário com título), ligado em `parseProgramFile` por detecção de `{\rtf`. Testes com o RTF enviado.
- Desempenho: `React.lazy` nas rotas e cards pesados, e `staleTime` nas consultas. Sem alterações no banco.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
