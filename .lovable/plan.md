# Avaliação: arquitetura Offline-First do Visita SC

## Resposta curta sobre PowerSync / ElectricSQL

Não recomendo hoje. Motivos concretos:

- Ambos sincronizam lendo a replicação lógica do Postgres. O banco do app é gerenciado pela Lovable Cloud; depender de replicação externa, de um serviço de sincronização pago e de um segundo backend fora da plataforma é um risco alto de quebra e de custo mensal recorrente.
- Eles substituem a camada de leitura/escrita inteira por SQL local. Hoje o app tem regras de segurança por congregação/usuário, filas de escrita, anexos, Bíblia offline e login por PIN/biometria já consolidados. Trocar a base significaria reescrever praticamente toda a leitura de dados — exatamente as áreas que já quebraram antes.
- O ganho real deles (sincronização em tempo real bidirecional e consultas SQL locais) resolve um problema que o app quase não tem: aqui o volume é pequeno (congregações, visitas, esboços, agenda), com um usuário por aparelho.

O tamanho do pacote (60 MB) não é o fator limitante — o limitante é risco e manutenção.

## O que realmente falta hoje

O app já tem muita coisa boa: cache persistente em armazenamento local, pré-carga de todas as tabelas, fila de escrita com repetição e agrupamento, sessão e PIN offline, Bíblia e anexos locais. O que ainda falha no uso real:

1. Não existe uma "verdade local" única. Cada tela lê do cache de consultas; se a consulta não foi pré-carregada com exatamente os mesmos parâmetros (outra congregação, outra semana), a tela aparece vazia offline.
2. Exclusões feitas em outro aparelho não somem do aparelho offline (não há marcação de itens apagados).
3. Não há resolução de conflito definida: dois aparelhos editando o mesmo registro podem sobrescrever um ao outro em silêncio.
4. A atualização só acontece quando o app está aberto e o usuário age; não há atualização automática ao recuperar boa conexão.
5. Não há uma tela clara de "estado da sincronização" (o que está pendente, o que falhou, quando foi a última atualização).

## Proposta recomendada (evolutiva, sem trocar a base)

Construir um banco local SQLite de verdade, mas mantendo o backend e as regras atuais intactos:

- **Armazenamento local**: SQLite nativo no Android (plugin Capacitor) e SQLite sobre OPFS na web, com a mesma interface nos dois. Uma tabela local por tabela sincronizada, com `updated_at` e marcação de exclusão.
- **Leitura**: as telas passam a ler do SQLite local (sempre instantâneo, sempre disponível), e a rede só atualiza o local em segundo plano. Migração tela a tela, começando pelas de maior dor.
- **Sincronização de entrada**: uma única rotina que baixa, por tabela, só o que mudou desde o último carimbo (`updated_at > último`), inclusive itens apagados, e grava no SQLite.
- **Sincronização de saída**: a fila de escrita atual vira a "caixa de saída" do SQLite, com a mesma lógica de repetição e agrupamento que já funciona.
- **Conflito**: regra explícita "quem gravou por último vence", por campo quando fizer sentido, com registro do que foi sobrescrito.
- **Automático com boa conexão**: sincroniza ao abrir, ao voltar do segundo plano e quando a conexão volta a ser considerada boa.
- **Painel de sincronização**: última atualização, pendências, erros e botão de forçar.

## Fases sugeridas

- **Fase 0 — base**: camada SQLite (nativo + web), tabelas espelho, carimbos e exclusões. Nenhuma tela muda ainda.
- **Fase 1 — entrada**: rotina de download incremental alimentando o SQLite, rodando junto com a pré-carga atual (sem remover nada).
- **Fase 2 — leitura**: migrar as telas críticas (esboços, semana da visita, agenda, congregações) para ler do SQLite, mantendo o caminho antigo como reserva.
- **Fase 3 — saída e conflito**: caixa de saída ligada ao SQLite, regra de conflito e reconciliação após envio.
- **Fase 4 — automação e painel**: sincronização automática, painel de estado, e só então aposentar o que virou redundante.

## Garantias de integridade

- Sem mudanças no banco remoto, nas regras de acesso, na Bíblia offline, nos anexos ou no login PIN/biometria.
- Cada fase entra com o caminho antigo preservado como reserva e pode ser desligada por uma chave.
- Verificação de tipos, suíte de testes e teste no aparelho a cada fase; versão incrementada por fase.

## Detalhes técnicos

- Plugin: `@capacitor-community/sqlite` (Android) + `wa-sqlite`/OPFS na web, atrás de uma interface única `localDb`.
- Requisito no backend para o download incremental: toda tabela sincronizada precisa de `updated_at` confiável e de marcação de exclusão (coluna `deleted_at` ou tabela de tombstones) — isso exige uma migração aditiva, sem alterar regras de acesso.
- A fila atual (`src/lib/offline-queue.ts`) é reaproveitada: muda o meio de armazenamento (de armazenamento simples para SQLite) e ganha reconciliação por `updated_at` do servidor.
- `src/lib/offline-prefetch.ts` vira o alimentador do SQLite em vez de alimentar só o cache de consultas.
- Alternativa mais leve, caso queira evitar SQLite: manter o cache atual e implementar apenas carimbos, exclusões, conflito e sincronização automática. Entrega ~70% do ganho com bem menos risco.
