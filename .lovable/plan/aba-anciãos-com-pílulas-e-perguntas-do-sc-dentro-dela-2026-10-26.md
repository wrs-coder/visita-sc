# Aba "Anciãos" com pílulas e "Perguntas do SC" dentro dela

Só aparência e navegação. Nenhum dado salvo, campo, permissão ou regra de senha muda.

## Nova tela "Anciãos"

```text
+-----------------------------------------+
| (Anciãos)(Estudos)(Reuniões)(Refeições) |
| (Transporte)                            |  <- "Checklist" sai daqui
+-----------------------------------------+
| Corpo de Anciãos                    (⤓) |
| Insira as informações referentes a      |
| pastoreio, encorajamento, recomendações,|
| assuntos locais e responda as perguntas |
| adicionais do superintendente de        |
| circuito.                               |
+-----------------------------------------+
| [🔒 Acesso Restrito              ⌄ ]    |  <- recolhido (só anciãos)
+-----------------------------------------+
| (Perguntas do SC)(PASTOREIO)            |
| (ENCORAJAMENTO)(RECOMENDAÇÕES)          |
| (ASSUNTOS LOCAIS)                       |  <- quebra linha, sem rolar
+-----------------------------------------+
|  conteúdo da pílula escolhida           |
+-----------------------------------------+
```

### Pílula PASTOREIO com dias

```text
| (PASTOREIO) selecionada                 |
| (Ter•)(Qua)(Qui•)(Sex)(Todos)           |
|  • = dia com pastoreio marcado          |
| > Ter 09:00 · Família Souza             |
| > Ter 15:00 · Irmão Lima                |
```
- Os dias saem do campo "Dia/Horário" já preenchido. Só aparecem pílulas de dias quando houver dias marcados.
- A pílula "Todos" mostra também os pastoreios ainda sem dia, então nenhum item fica escondido.

### Pílula Perguntas do SC

```text
| (Perguntas do SC) selecionada           |
| Informações adicionais                  |
| Responda as perguntas abaixo referentes |
| à congregação.                          |
| Progresso  3/8 (37%)                    |
| [✓] Pergunta 1 ...                 ⌄    |
```
- É o mesmo conteúdo da tela Checklist atual (marcar, responder, adicionar, exportar, relatório).

### Card Acesso Restrito (aberto)

```text
| 🔒 Acesso Restrito                ⌃     |
| Se desejar, poderá definir uma senha    |
| para aumentar a confidencialidade das   |
| informações abaixo. Não esqueça de      |
| partilhar a senha com os outros anciãos.|
| [ senha .......... ] [Salvar]           |
```
- Começa recolhido e só abre ao tocar.

## O que continua funcionando
- O endereço antigo da Checklist (atalhos, lembretes, relatório) abre a tela Anciãos já na pílula "Perguntas do SC".
- A pílula escolhida fica lembrada no aparelho.
- Senha da aba, quem pode criar ou alterar e a tela de bloqueio dos visitantes continuam iguais.

## Detalhes técnicos
- Extrair o corpo de `_app.checklist.tsx` para `components/visit-week/ChecklistPanel.tsx` (sem `VisitProgramTabs`, com o novo título/subtítulo); `/checklist` passa a redirecionar para `/programa-ancioes?tab=questions`.
- `_app.programa-ancioes.tsx`: `validateSearch` com `tab`; `SectionPills` (questions, pastoral, encouragement, recommendations, local); as seções inativas ficam `hidden` (sem desmontar, os rascunhos são mantidos). O título e o subtítulo vão para o i18n.
- Pastoreio: extrair o prefixo do dia de `slot_label` com um helper puro (`slot-day.ts` + teste) e mostrar as pílulas no estilo `VisitDayPills`, com a opção "Todos".
- `ElderTabPasswordCard`: envolver em um recolhível fechado por padrão e trocar os textos.
- `VisitProgramTabs`: remover Checklist; o item "Programa da visita" na barra lateral segue ativo em `/checklist`.
- Rótulos novos no i18n pt/en/es. Validar com `bunx tsgo --noEmit`, `bunx vitest run` e uma captura em 393px.
