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

**Pendência confirmada:** no Pastoreio, o SC só consegue escolher combinações de dia e horário já definidas no modelo. Falta editar livremente o dia e a hora de um pastoreio desta visita. Os pontos (01), (02), (03) e as sugestões anteriores já foram entregues; esta etapa trata somente dessa pendência.

```text
┌──────────────────────────────┐
│ Programa da visita           │
│ [Pastoreio] [Encorajamento]   │
│                              │
│ Família: Silva            ▾  │
│ Dia/Horário                  │
│ [Quinta-feira, 15:00    ▾] ✎ │
│                              │
│ Ao tocar no lápis:            │
│ Dia     [Quinta-feira     ▾]  │
│ Horário [15:00            ⏱]  │
│ [Cancelar] [Salvar dados]    │
└──────────────────────────────┘
```
- Preservar a lista atual de horários; acrescentar um lápis disponível ao SC quando a edição estiver liberada.
- Ao tocar no lápis, abrir dia da semana e horário separados, preenchidos com o valor atual. Oferecer os dias que pertencem à semana da visita.
- Só gravar ao tocar em **Salvar dados**; Cancelar não muda nada. Se outro pastoreio já usar o horário escolhido, manter a confirmação de conflito existente.
- Gravar somente o horário daquele pastoreio na visita selecionada: não alterar o modelo, os demais pastoreios nem outras congregações.
- Manter o horário personalizado visível na lista e nas pílulas de dias. Preservar a escolha e troca de horários pelos anciãos conforme as permissões atuais.
- Conferir o uso do novo horário nos relatórios e no envio ao Cronograma; se já tiver sido enviado, não criar automaticamente outro compromisso nem modificar notas privadas sem ação explícita.
- Preservar os dados existentes e o funcionamento sem internet; não alterar os arquivos protegidos de sincronização. Verificar o comportamento de salvamento offline atual antes de implementar, sem prometer suporte adicional.
- Atualizar a Ajuda e as traduções em português, inglês e espanhol. Não mexer no Conversor S-21 nem no Analisador.
- Validar com testes de horário personalizado, conflito e isolamento por visita, além de conferir na tela, com conta de SC, a alteração e sua leitura após salvar.
- Risco: baixo a médio. O formato atual do horário será mantido; não há mudança de banco prevista. Reaplicar modelos continuará obedecendo ao tratamento de atualizações pendentes existente.

### Conferência dos caminhos relacionados

**Regra:** o SC deve conseguir mudar o dia e a hora de um pastoreio desta visita, e as próximas visualizações e envios devem usar essa escolha, sem alterar o modelo ou registros já enviados.

- **Tela de Pastoreio do SC — código lido:** não atende à edição livre; o seletor só oferece os horários do modelo. Será corrigido.
- **Seleção e troca pelos anciãos — código lido:** dependem da lista de horários do modelo. A apresentação de um horário personalizado precisa ser ajustada sem ampliar as permissões de edição.
- **Pílulas e contagem de horários — código lido:** as pílulas do SC leem os eventos, mas `pastoral-slots.ts` considera um horário fora da lista como não atribuído. Essa suposição precisa ser corrigida para horários personalizados válidos.
- **Leitura e validador do programa — código lido:** carregam `slot_label` e aceitam texto; não impõem a lista do modelo. Confirmar a gravação autorizada na implementação.
- **Resumo da visita e acesso por código — código lido:** preservam `slot_label`; a visualização somente leitura o mostra diretamente. Compatíveis com o formato atual.
- **Enviar ao Cronograma e salvar em Notas — código lido:** `ProgramDispatchSheet` e `pastoral-dispatch.ts` resolvem dia da semana e hora pelo texto, dentro das datas da visita; não exigem horário do modelo. Preservar as marcações de envio para não duplicar ou alterar registros já enviados.
- **Relatórios PDF, reaplicação de modelos, tarefas em segundo plano e funções do banco — ainda não auditados nesta etapa:** verificar referências ao horário na implementação; não declarar esses caminhos testados antes da leitura e validação necessárias.

Nenhuma tela foi alterada nesta etapa: aguarda aprovação deste esboço.

## Sugestões
- Em (02) e (03), lembrar no aparelho os textos já digitados em "Outro" para sugerir na próxima vez.
- Em (04), um selo "editado nesta visita" nos itens que diferem do modelo.

## Detalhes técnicos
- (01) `src/lib/epub-bible-parser.ts` (montagem do texto, ~linha 770) + teste em `src/lib`.
- (02) campo `modality`/`modality_other` no payload de `program_template_items` (kind study) e nos itens da visita equivalentes; rótulos em `pt/en/es.json`, `VisitProgramTabs`, `help-content.ts` (+ ajuste em `help-content.test.ts`).
- (03) migração: `ALTER TYPE field_modality ADD VALUE 'outro'` + coluna `modality_other text` em `field_meeting_templates`, `field_meeting_template_items`, `field_meetings`; `enum-labels.ts`, `board-program.ts`, `template-io.functions.ts`.
- (04) arquivos previstos: `src/routes/_app.programa-ancioes.tsx` (campos e salvamento do dia/horário), `src/lib/pastoral-slots.ts` e seu teste (normalização e conflito, se necessário), `src/lib/help/help-content.ts` e `src/i18n/locales/{pt,en,es}.json` (Ajuda e rótulos). A tela reutiliza a escrita existente do `slot_label`, restrita ao `visit_id`; revisar seu validador e as leituras do cronograma sem modificar funções adjacentes. Sem migração prevista e sem alteração da infraestrutura offline.
- Testes por regra: modalidade padrão de itens antigos, "Outro" exige texto, edição da visita não altera modelos.
