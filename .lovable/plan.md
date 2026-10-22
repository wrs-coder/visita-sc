# Esboços pessoais: tela limpa e premium (só visual)

Nada muda em regras, salvamento, sincronização, banco, formato dos esboços, Bíblia, login, PIN ou biometria. São só mudanças de aparência e de caminho na tela, feitas em rodadas pequenas, com testes e conferência no celular e no computador ao fim de cada uma.

## 1. Lista e leitura separadas
- No celular, a lista abre sozinha. Ao tocar num esboço, ele ocupa a tela inteira, com uma seta "Voltar" para a lista.
- No computador e no tablet, a lista fica numa coluna estreita à esquerda e o esboço aberto à direita.
- Ao voltar, a lista continua na mesma posição e com a mesma busca.

## 2. Barra da lista enxuta
- Os 5 botões que hoje ficam apertados viram um botão principal "+ Novo". Ele abre um menu com Novo esboço, Importar Word, Nova pasta, Anexar e Sincronizar.
- A busca ocupa a linha inteira. As pastas viram pílulas que você desliza para o lado.
- As ações continuam as mesmas, só mudam de lugar.

## 3. Cartões da lista mais legíveis
- Cada esboço mostra o título em destaque, uma linha de prévia, a data e a pasta como uma etiqueta discreta.
- Mais espaço entre os cartões e área de toque maior. Apagar com "Desfazer" continua igual.

## 4. Detalhes da Consideração de Campo num botão
- Um botão discreto de informação, no modo esboço e na tela cheia, abre uma janela só para ler Data, Período, Título, Oração, Território e Ajudantes. Campos vazios não aparecem.
- Na primeira rodada, os campos de preenchimento continuam visíveis. Depois que você aprovar no uso real, eles passam para "Editar detalhes", recolhidos.
- A janela abre por cima da tela cheia sem parar o cronômetro.

## 5. Leitura como folha impressa
- Ao abrir no modo leitura: margens confortáveis, linhas um pouco mais espaçadas e largura de texto limitada no computador.
- A barra de edição aparece só quando você toca em "Editar".
- O cronômetro fica numa faixa fina e recolhível. Versículos clicáveis, recuos do Word e tópicos recolhíveis continuam iguais.

## Ordem segura
```text
Rodada 1: item 4 (só acrescenta)  ->  Rodada 2: itens 2 e 3 (lista)
Rodada 3: itens 1 e 5 (abrir e ler)  ->  Rodada 4 (opcional): recolher os campos da Consideração de Campo
```

## Verificação
- Todos os testes e a verificação de código a cada rodada, mais um teste novo para a janela de detalhes (só mostra os campos preenchidos).
- Teste com sua conta nos tamanhos de celular e computador: criar, abrir, editar, salvar, importar Word, usar a tela cheia com o cronômetro, abrir um versículo, apagar e desfazer.

## Detalhes técnicos
- Novo `FieldNoteInfoButton.tsx`, que reaproveita `DayDetailsDialog` e `InfoList` e recebe os valores por props.
- Menu "+ Novo" com `DropdownMenu`, chamando os mesmos handlers que existem hoje.
- Lista/leitor: estado de apresentação no próprio route (esboço selecionado); grade `md:grid-cols-[18rem_1fr]`. O editor continua carregado sob demanda, como já é hoje.
- Só tokens de `src/styles.css` (claro, escuro e OLED); textos i18n pt/en/es com `defaultValue`.
- Arquivos principais: `_app.notas.tsx`, `_app.consideracoes-campo.tsx`, `FieldNoteFullscreenDialog.tsx` e o leitor de esboço. Sem alterações em `*.functions.ts`, nos hooks de sincronização nem no banco.
