# Corrigir: evento importado sem partes

## O que aconteceu
Na nova regra, só as partes "Oração", "Presidente do programa" e a "Música" ganharam horário fixo. As outras partes ficaram sem essa informação. Quando o app grava todas as partes de uma vez, a parte que não tem a informação é enviada como "vazia", e o servidor recusa o pacote inteiro. Resultado: o evento é criado, mas nenhuma parte é salva ("Nada aqui.").

## Correção
1. Ao importar, toda parte sai com o modo de horário definido: "fixo" para Oração/Presidente/Música e "automático" para as demais. Assim nenhuma parte vai incompleta.
2. Se mesmo assim o servidor recusar as partes, o evento recém-criado é apagado e aparece a mensagem "Não foi possível importar as partes", em vez de deixar um evento vazio.
3. Teste novo: toda parte importada (.rtf, .etim, .csv, .json) tem o modo de horário preenchido.

## O que fazer com o evento vazio que já foi criado
Apague-o pelo menu ⋯ do evento e importe o .rtf de novo depois da correção.

## Detalhes técnicos
- Causa: o insert em lote do cliente une as chaves de todos os objetos (`columns=`) e preenche as ausentes com NULL; `time_mode` é NOT NULL, então o lote inteiro falha.
- `applyProgramRules` passa a definir `time_mode: p.time_mode ?? "auto"` em todas as partes; `createEvent` também normaliza (`time_mode ?? "auto"`, `speaker_name ?? null`).
- Em `createEvent`, se o insert das partes falhar: `delete` do evento criado + toast de erro.
- Sem mudança no banco nem aumento de versão.
