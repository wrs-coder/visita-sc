# Melhorias no Visita SC — 4 pontos

Minha opinião: os 4 pontos são bons. Riscos estão marcados em cada um. Nada é apagado; o que já existe continua funcionando.

## (01) Balão bíblico com palavras juntas (Provérbios)

O que vi: o texto do versículo é montado juntando pedaços do livro importado. Só é colocado espaço quando o pedaço anterior é um "fim de linha". Em Provérbios (texto em versos poéticos) as linhas vêm em pedaços separados que não são reconhecidos como fim de linha, então as palavras grudam. Uma mudança posterior na leitura da Bíblia provavelmente fez isso voltar — **ainda não confirmado**.

Plano:
1. Primeiro reproduzir com um trecho de Provérbios e confirmar a causa.
2. Corrigir: colocar espaço entre pedaços de linha poética e entre trechos separados, sem criar espaço duplo nem separar palavras com acento.
3. Criar teste com Provérbios, Salmos e um livro em prosa, para não voltar de novo.
- Risco: baixo. O texto salvo não muda, só a forma de mostrar.

## (02) "Estudos e Revisitas" vira "Companhia (Ministério)"

```text
┌─────────────────────────────┐
│ Modelos Visita              │
│ [Companhia (Ministério)] [Refeições] [Transporte]
│ [Ter] [Qua] [Qui] [Sex]     │
│ ┌─────────────────────────┐ │
│ │ Modalidade          ▾   │ │
│ │  • Estudos              │ │
│ │  • Revisitas            │ │
│ │  • Estudos e Revisitas  │ │
│ │  • Testemunho c/ Carrinho│ │
│ │  • Casa em casa         │ │
│ │  • Outro                │ │
│ ├─────────────────────────┤ │
│ │ Qual modalidade? [____] │ │ ← só com "Outro"
│ │ Para quem ▾  Horário    │ │
│ │ Ponto de encontro ...   │ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```
- Novo nome em Modelos Visita, no programa da visita, na pílula dos anciãos, na Ajuda e nos PDFs.
- Modalidade padrão para itens antigos: "Estudos e Revisitas" (nada muda para o que já foi criado).
- Os anciãos veem a modalidade escolhida (ou o texto de "Outro") em cada pedido de companhia.
- Risco: baixo. A modalidade fica junto dos dados do item, sem mudar o banco.

## (03) Campo: opção "Outro"

```text
┌─────────────────────────────┐
│ Modalidade          ▾       │
│  Casa em casa / Telefone /  │
│  Cartas / ... / Outro       │
│ Qual modalidade? [Feira___] │ ← só com "Outro"
└─────────────────────────────┘
```
- Vale em Modelos Visita (Campo) e no programa da visita; o texto digitado aparece para anciãos, no quadro e nos PDFs.
- Risco: médio. Precisa de um novo valor "Outro" e de um campo de texto no banco (mudança só de acréscimo; nada antigo muda). Importar/exportar modelos passa a aceitar esse valor.

## (04) Programa da visita — modo edição completo do SC

```text
┌─────────────────────────────┐
│ Programa da visita  [✎ Editando]
│ (Anciãos)(Companhia)(Reuniões)(Refeições)(Transporte)
│ Qua 12/11                   │
│ ┌─────────────────────────┐ │
│ │ 08:30 Campo · Casa em casa│
│ │ Modalidade ▾  Horário ⏱ │ │
│ │ Observações [_________] │ │
│ │                 🗑 Excluir│ │
│ └─────────────────────────┘ │
│ [＋ Adicionar horário]       │
│ ⓘ Muda só esta congregação. │
│   Os modelos não mudam.     │
└─────────────────────────────┘
```
- Com o modo edição ligado, o SC pode criar, mudar e excluir itens em todas as abas (horários, modalidades, observações, novos itens).
- Grava só nos dados desta visita; a tela Modelos Visita nunca é alterada.
- Antes de construir, vou levantar aba por aba o que já é editável hoje e fazer só o que falta.
- Risco: médio. Se depois o modelo for aplicado de novo à visita, o aviso de "atualização pendente" que já existe continua decidindo — as mudanças feitas à mão não são apagadas sem perguntar.

## Sugestões
- Em (02) e (03), lembrar no aparelho os textos já digitados em "Outro" para sugerir na próxima vez.
- Em (04), um selo "editado nesta visita" nos itens que diferem do modelo.

## Detalhes técnicos
- (01) `src/lib/epub-bible-parser.ts` (montagem do texto, ~linha 770) + teste em `src/lib`.
- (02) campo `modality`/`modality_other` no payload de `program_template_items` (kind study) e nos itens da visita equivalentes; rótulos em `pt/en/es.json`, `VisitProgramTabs`, `help-content.ts` (+ ajuste em `help-content.test.ts`).
- (03) migração: `ALTER TYPE field_modality ADD VALUE 'outro'` + coluna `modality_other text` em `field_meeting_templates`, `field_meeting_template_items`, `field_meetings`; `enum-labels.ts`, `board-program.ts`, `template-io.functions.ts`.
- (04) auditoria das rotas da semana da visita; escrita só em tabelas por `visit_id`.
- Testes por regra: modalidade padrão de itens antigos, "Outro" exige texto, edição da visita não altera modelos.
