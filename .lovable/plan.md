# Pacotes da visita: no aparelho ou no banco?

## Situação atual
Os pacotes ficam só no aparelho de quem os criou e não vão para o servidor. Os modelos que eles agrupam já ficam no banco, e o pacote serve apenas para preencher os 5 modelos ao criar uma visita.

## Deixar no aparelho (como está)
**Prós**
- Não exige mudança no banco nem nas permissões, então o risco é zero.
- Funciona sem internet e abre na hora.

**Contras**
- Os pacotes se perdem se o aparelho for trocado, se o app for reinstalado ou se os dados forem limpos. Hoje, o backup só os salva se você exportar manualmente.
- O que é criado no celular não aparece no computador, e o contrário também.
- O pacote pode apontar para um modelo que já foi apagado. Hoje só aparece um aviso.

## Levar para o banco (como os modelos)
**Prós**
- O mesmo pacote aparece em todos os seus aparelhos e sobrevive à troca de celular e à reinstalação.
- Fica igual aos modelos: mesmo lugar, mesmas regras e mesmo backup.
- Quando um modelo for apagado, o banco limpa sozinho a ligação dele com o pacote.

**Contras**
- Exige uma tabela nova com regras de acesso, mas é pouco trabalho.
- Sem internet, a mudança feita no pacote fica na fila e sobe depois. É assim que os modelos já funcionam hoje.

## Recomendação
**Levar para o banco.** Para o superintendente, o pacote é algo de longo prazo, como os modelos, e perdê-lo numa troca de celular é o maior risco. O app já tem a fila sem internet, então nada piora fora da rede.

## O que seria feito (só após sua aprovação)
- Criar uma tabela de pacotes ligada ao superintendente. Só ele vê e edita os próprios pacotes; anciãos, comissão e esposa não têm acesso.
- Na primeira abertura, os pacotes que já estão no aparelho sobem automaticamente para o servidor, uma única vez, e nenhum se perde.
- A tela Pacotes e o seletor no itinerário continuam iguais visualmente. Exportar e importar continuam funcionando.
- A escolha dos modelos de cada visita continua igual, e as visitas já criadas não mudam.

## Detalhes técnicos
- Migração `visit_packages` (`id`, `superintendent_id`, `name`, 5 colunas `*_template_id` uuid nulas com `ON DELETE SET NULL` para as tabelas de modelos, timestamps), RLS `superintendent_id = auth.uid()` + papel superintendent, e GRANTs.
- `visit-packages.ts` passa a ler e gravar pelo cliente com `offlineInsert/Update/Delete`. O localStorage vira cache e origem da migração única (flag `visit-packages:migrated:<userId>`).
- Teste da migração local→servidor (sem duplicar). Atualizar a regra correspondente no AGENTS.md.
