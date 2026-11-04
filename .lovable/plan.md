# Próximas melhorias para o app funcionar de verdade sem internet

Sugestões em ordem de importância. Nada muda no banco de dados, no login online nem na versão. Você escolhe quais aprovar.

## 1. Testar as telas que ainda não foram testadas (mais importante)
No último teste, seis telas abriram sem internet. Estas telas ainda leem direto do servidor em alguns pontos e **não foram testadas**:
- Grandes Eventos (Circuito)
- Relatório da visita e Relatório completo
- Semanas sem visita (editar), Transporte, Cronograma
- Reuniões e Discursos, Checklist, campos do esboço de discurso

Para cada uma: passar a ler a cópia do celular e testar com a internet "pendurada". Uma tela só conta como pronta depois que passar no teste.

## 2. Painel "Pronto para ficar sem internet" (no Perfil)
```text
+-----------------------------------+
| Sem internet                      |
| (v) Itinerário        atualizado  |
| (v) Congregações (17) atualizado  |
| (v) Esboços           atualizado  |
| (!) Anexos: 3 sem download        |
| Última sincronização: hoje 08:12  |
|  [ Baixar o que falta ]           |
+-----------------------------------+
```
Antes de viajar, você vê se tem tudo no celular.

## 3. Anexos dos esboços (PDFs e imagens)
Hoje o texto fica no celular, mas um anexo nunca aberto pode não estar baixado. Proposta: o botão Sincronizar baixa também todos os anexos.

## 4. Impedir o Android de apagar os dados
O pedido de "armazenamento permanente" hoje só é feito pela Bíblia. Fazer o mesmo pedido para todos os dados do app.

## 5. Acesso por PIN: prazo de 30 dias
Hoje o PIN deixa de valer após 30 dias sem nenhuma conexão. Opções: manter 30 dias (regra atual), ampliar para 90 dias, ou avisar 5 dias antes de vencer. Mudar o prazo altera uma regra do instructions.md e só faço se você autorizar.

## 6. Aviso de pendências
Mostrar no topo um número ("2 alterações aguardando envio") para lembrar de tocar em Sincronizar quando voltar a ter internet. Nada é enviado sozinho.

## 7. Teste automático permanente
Um teste que simula a internet pendurada e abre todas as telas. Ele roda antes de cada nova versão, para que ajustes futuros não quebrem o uso offline sem ninguém perceber.

## O que não dá para funcionar sem internet
Primeiro login num celular novo, receber dados novos dos anciãos, links públicos de Grandes Eventos e convites da esposa. Isso depende do servidor por natureza.

## Detalhes técnicos
- Chamadas diretas `supabase.from` em BigEvents.tsx, _app.relatorio.$visitId.tsx, FullVisitReportDialog.tsx, ItineraryWeeks.tsx, TalkOutlineFields.tsx, _app.transporte/cronograma/reunioes-discursos, ChecklistPanel, SingleRowPanel: migrar para local-first-fetch / mirror-tables e confirmar a tabela no inventário de sync.
- Anexos: pré-download em outline-attachments.ts durante a sincronização manual, gravando em partes (regra já existente).
- `navigator.storage.persist()` no início do app, não só em bible-notes-store.ts.
- Painel: lê status do local-db (contagem por tabela + data da última sync), sem rede.
- Teste: Playwright com rotas bloqueadas/penduradas percorrendo todas as rotas `_app.*`, pílulas e subabas.
- Validação: `bunx tsgo --noEmit` e `bunx vitest run`.
