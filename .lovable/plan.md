# Escadinha de recuos ao colar do Word nos esboços

## Objetivo
Quando você colar um esboço do Word, cada parágrafo entra no mesmo degrau de recuo que tinha no Word, inclusive a segunda linha dos parágrafos longos. O resultado aparece igual na edição, na leitura e na tela cheia das abas Esboços e Dashboard. Isso funciona com o aplicativo em qualquer idioma (português, inglês e espanhol) e com o Word em qualquer idioma.

## Etapas

1. **Primeiro, confirmar onde o recuo se perde**
   - Montar uma amostra de HTML igual ao que o Word realmente coloca na área de transferência para um esboço com 3 degraus. Isso inclui recuo deslocado (margem esquerda positiva com primeira linha negativa), recuo por tabulações e recuo por margem.
   - Passar essa amostra pelas três etapas, uma de cada vez: o limpador da colagem, a leitura do editor e o filtro de segurança da exibição. O teste vai mostrar em qual delas o degrau some. Só depois disso a causa será corrigida.

2. **Um único cálculo de degraus no limpador da colagem**
   - Um degrau a cada 1,25 cm (36 pt / 0,5 in), até no máximo 8 degraus.
   - Recuo deslocado: o degrau vem da margem esquerda. A primeira linha negativa não reduz o degrau, para a segunda linha ficar alinhada.
   - Recuo feito com tabulações ou espaços no começo do parágrafo vira degrau, e esses espaços são removidos.
   - Listas do Word: o nível 1, 2, 3... vira lista dentro de lista.
   - O resultado sai sempre como `margin-left` em múltiplos de 32px, o mesmo formato dos botões de recuo que já existem.

3. **O editor lê exatamente esse formato**
   - Ajustar a leitura de recuo do editor para usar a mesma régua de 32px por degrau, sem tentar adivinhar de novo pelas medidas do Word.
   - Valer também para títulos e para itens dentro dos tópicos recolhíveis.

4. **A exibição mostra o mesmo degrau**
   - Conferir se o filtro de segurança da leitura mantém o `margin-left` nos parágrafos e títulos e se o estilo compartilhado não zera essa margem. Se precisar, corrigir só isso.

5. **Funciona em qualquer idioma**
   - Nada depende de texto ou de palavras. A detecção usa só marcas técnicas do Word (`mso-`, classes `Mso`), que são iguais em todos os idiomas.
   - Aceitar vírgula decimal (`1,25cm`), que aparece no Word em português e espanhol.
   - Nenhum texto novo aparece na tela, então não há traduções a acrescentar.

6. **Validação**
   - Testes automáticos com amostras de 3 degraus: recuo deslocado, tabulações, vírgula decimal, listas multinível e colagem que não vem do Word (essa tem que continuar idêntica).
   - Teste no navegador: colar a amostra no editor de esboço, salvar e conferir os degraus na leitura e na tela cheia.
   - Rodar `bunx tsgo --noEmit` e `bunx vitest run` com tudo aprovado.

## O que não muda
Banco de dados, Bíblia automática, tópicos recolhíveis, anexos, cronômetro e esboços já salvos.

## Detalhes técnicos
- Arquivos: `src/lib/word-paste-cleaner.ts` e o teste dele, `IndentExtension` em `RichNoteEditor.tsx`, e, só se a etapa 1 mostrar necessidade, `src/lib/rich-content.tsx` e `src/lib/rich-note-styles.ts`.
- Regra a registrar no AGENTS.md: o recuo colado é normalizado uma única vez no limpador para `margin-left` em múltiplos de 32px, e o editor e a exibição apenas leem esse formato.
