# Plano: transferir visita TEST + título do balão + pílula de cores

## 01 — Copiar a visita TEST (23–28 fev 2027) para a TEST (10–15 nov 2026)

Situação conferida: as duas visitas existem e já têm dados (14 itens da lista, 7 saídas de campo, 3 acompanhantes, 4 refeições, 16 transportes cada). Os dois períodos começam numa terça-feira, então cada dia cai no mesmo dia da semana (diferença de 15 semanas).

O que será feito (uma vez, só nos dados, sem mudar a estrutura do banco):
1. Guardar uma cópia de segurança dos dados atuais da visita de novembro.
2. Apagar os dados atuais da visita de novembro.
3. Copiar tudo da visita de fevereiro para novembro, recuando as datas 15 semanas: programa, refeições e notas do dia, saídas de campo, acompanhantes, transporte, lista de tarefas, reuniões (meio de semana, fim de semana, pioneiros, anciãos), programa dos anciãos (pastoreios, encorajamento, recomendações, assuntos locais), observações e modelos aplicados.
4. A visita de fevereiro continua igual (não é apagada).
5. Anotações particulares ficam onde estão (não são movidas).

Depois: no celular, tocar em Sincronizar para receber a nova versão da visita.

## 02 — Título longo no balão bíblico

```text
Antes                          Depois
+----------------------------+ +----------------------------+
| ⠿ 1 Tessalonicense 5:… Aa⋯✕| | ⠿ 1 Tes. 5:12,13    Aa ⋯ ✕ |
+----------------------------+ +----------------------------+
```
Quando o nome completo não couber, usar a mesma abreviação do topo do Leitor da Bíblia. Nomes curtos ("Mateus 6:33") continuam por extenso. O título completo segue no aviso ao segurar o dedo.

## 03 — 📝 dentro da pílula de cores

```text
Antes                                Depois
( 🟡 🟢 🔵 🟣 🟠 🔴 | ⭐ ) 📝          ( 🟡 🟢 🔵 🟣 🟠 🔴 | ⭐ 📝 )
```
A pílula passa a ter a largura do próprio conteúdo, com bolinhas um pouco menores em telas estreitas, para que ⭐ e 📝 sempre fiquem dentro dela. Funções iguais; barra inferior intacta.

Ajuda atualizada apenas se o texto atual citar o título por extenso.

## 04 — Voltar ao capítulo depois de Anotar ou Ponto alto

```text
Hoje                               Depois
Leitor Prov 22 → 📝 Anotar          Leitor Prov 22 → 📝 Anotar
   → Salvar/Voltar                     → Salvar/Voltar
   → aba Bíblia (lista de livros)      → Leitor Prov 22, rolado até o v. 11
```
Ao salvar ou voltar de uma Anotação ou de um Ponto alto aberto pelo leitor, o app retorna à mesma leitura: mesmo livro, capítulo e plano, rolando até o versículo usado. Se a anotação for aberta por outro caminho (lista de anotações), o voltar continua como hoje.

## Detalhes técnicos
- 04: `BibleReadingTab` perde o estado `reading` porque `createFromVerse` (GuestWorkspace) troca de aba/desmonta. Guardar um "retorno ao leitor" `{track, chapterKey, readingDay, verse}` (sessionStorage, por espaço de trabalho) ao chamar `onNote`/`onHighlight`; ao fechar o editor de nota ou a gaveta de Ponto alto, voltar à aba Bíblia, reabrir `CleanReader` com esse capítulo e rolar até `data-verse`. Limpar o retorno depois de usado. Teste puro para gravar/consumir o retorno.
- 01: SQL de dados (insert…select com `date + interval '-105 days'` e `meeting_at - interval '105 days'`) por tabela filha de `visits`; backup em JSON em /mnt/documents antes de apagar. Sem migração, sem RLS. Copiar também colunas de modelo/`template_snapshot`/`visit_template_overrides`.
- 02: `BibleVersePopover` usa o abreviador já existente de `bible-reader-settings`; medir se o título cabe (ou limite de caracteres ~14) e trocar para abreviado; `title` attr com o nome completo. Teste puro do formatador.
- 03: em `CleanReader.tsx`, trocar `width: 300` fixo por `w-max max-w-[calc(100vw-16px)]`, swatches `h-6 w-6` abaixo de 360px, recalcular `left` com largura estimada.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
