# Revisão geral do que foi alterado hoje

Objetivo: conferir se tudo que depende das mudanças de hoje continua funcionando. Nesta etapa NADA é corrigido: só investigo, testo e entrego um relatório explicando cada problema, o risco e a correção mais segura. Você escolhe depois o que será feito.

Mockup: nenhuma tela muda nesta etapa. Se alguma correção futura mexer no visual, ela virá com mockup ASCII de celular antes.

## Formato do relatório que vou entregar

```text
Item                         Situação     Risco    Correção sugerida
Painel - cartão Visita       OK           -        -
Balão na tela cheia          Problema     Baixo    usar Bíblia "Esboços"
Sincronizar esboços          Verificar    Médio    ...
```

## O que já encontrei na primeira busca

- 37 telas/arquivos usam as partes alteradas hoje (campos "Solicitar aos anciãos", bloco dos anciãos, Bíblia por aba, barra do topo, Assuntos locais).
- Suspeita 1: a tela cheia da anotação de campo no Painel ainda usa a "Bíblia em uso" geral, e não a Bíblia escolhida para "Esboços e anotações". Os balões dela podem mostrar a tradução errada.
- O botão Sincronizar dos esboços lê território, localização, dirigentes auxiliares e oração final direto do Programa da visita — ainda não respeita os itens "solicitados" (precisa conferir se isso causa texto faltando ou sobrando).

## O que vou verificar (sem corrigir)

01. Painel (Dashboard)
- Cartões Agenda, Esboços, Visita e Pastoreio: contagens e textos que vêm do Programa da visita, Campo, Reuniões e Assuntos locais.
- Cópia local (modo sem internet): confirmar que a coluna nova do Campo é guardada e lida, para o Painel não ficar vazio offline.

02. Cronômetro dos esboços e balões bíblicos
- Cronômetro/tempo por tópico continua igual (nada dele foi tocado, mas vou testar abrindo um esboço).
- Balões de versículo: esboços, anotações, Estudo pessoal e tela cheia do Painel devem usar a Bíblia de "Esboços"; a leitura usa a de "Leitura". Corrigir a Suspeita 1.

03. Botão Sincronizar dos esboços
- Conferir que puxa os dados do Programa da visita (Campo e Reuniões) com os campos novos, sem apagar o que já estava escrito.

04. Outros pontos ligados indiretamente
- Relatórios em PDF/Word da visita e "Finalizar visita".
- Backup automático, restauração e exclusão de visita (incluem a coluna nova).
- Aplicar modelo a uma visita (campos solicitados copiados certo).
- "Copiar para…" e o bloco dos anciãos que abre sozinho.
- Ajuda (/ajuda): os nomes de telas citados ainda existem.

## Como vou confirmar

- Rodar todos os testes e a checagem de erros.
- Abrir o app no navegador simulando o celular: Painel, um esboço com cronômetro e balão, Sincronizar, e Programa da visita.
- Ler o código de cada ponto ligado às mudanças.
- No fim, entrego o relatório acima: "OK" ou "problema", com explicação simples e a correção mais segura. Nenhum arquivo do app é alterado.

## Detalhes técnicos

- `FieldNoteFullscreenDialog.tsx:102` chama `getActiveLibrary()` sem escopo → passar `"outlines"`.
- `field-note-sync.ts` seleciona os 4 campos sem `requested_fields`; avaliar uso de `fieldVisible`.
- Conferir `mirror-tables.ts`, `offline-prefetch.ts`, `backup.functions.ts`, `visit-deletion.functions.ts`, `visit-summary.functions.ts`, `guest.functions.ts` quanto a `requested_fields`.
- Sem mudanças no banco nem no visual; versão não muda.
