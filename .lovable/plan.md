# Auditoria de segurança — o que encontrei

## Boas notícias (verificado no código)

- **A senha mestre do superintendente NÃO está no código.** Ela é lida no servidor a partir de uma variável de ambiente secreta (`SUPER_REGISTRATION_CODE`) dentro do server function. Não existe nenhuma ocorrência do número no repositório, nem no bundle enviado ao navegador.
- **Nenhuma chave secreta exposta.** As únicas chaves presentes no cliente são a URL do backend e a chave publicável (anon) — elas são públicas por design e protegidas por RLS. A chave de serviço só existe no servidor.
- **Senhas de login dos usuários não são armazenadas pelo app.** Elas ficam no serviço de autenticação (hash) e a redefinição feita pelo superintendente é validada no servidor (só funciona para anciãos das congregações dele).
- **Verificação automática do banco não apontou problemas de configuração.**

## Pontos que recomendo corrigir

### 1. Hash da senha da aba "Anciãos" visível a todos os membros (nível crítico)
Hoje qualquer membro autenticado de uma congregação consegue ler a linha completa da congregação, incluindo o hash da senha da aba Anciãos. Isso permite tentativas de quebra offline dessa senha.

Correção: remover o acesso a essas colunas via API de dados (revogar por coluna, como já foi feito com a senha em texto), e expor os dados da congregação para membros por uma consulta/visão que não inclui campos de senha.

### 2. Consulta pública de telefone revela o e-mail real do usuário
O endpoint usado na tela de login aceita um telefone sem autenticação e devolve o e-mail cadastrado. Isso permite descobrir se um telefone existe e qual o e-mail dele.

Correção: manter a resolução telefone → conta apenas no servidor, sem devolver o e-mail ao navegador (o login passa a ser concluído no próprio servidor/edge), e limitar tentativas repetidas.

### 3. Regras de permissão só validadas na escrita, não na leitura/edição
Em várias tabelas de modelos e eventos do superintendente, a checagem do papel "superintendente" existe só na criação, não na leitura/alteração/exclusão de registros já existentes. Se o papel de alguém for removido, ele ainda consegue mexer nos registros antigos que criou.

Correção: aplicar a mesma checagem de papel também nas regras de leitura/alteração/exclusão dessas tabelas.

### 4. Endurecimento adicional (opcional, recomendado)
- Exigir senha mínima maior que 6 caracteres para contas de superintendente.
- Limitar tentativas de uso do código mestre de superintendente (proteção contra força bruta) e registrar tentativas falhas.

## Detalhes técnicos

- Migration: `REVOKE`/policy split em `public.congregations` para excluir `elder_tab_password_hash`, `elder_tab_password_created_by`, `elder_tab_password_updated_at` da leitura por membros; criar view segura `congregations_public` (ou RPC) usada pelo cliente.
- Ajustar `USING` das policies `ALL` em `meeting_talk_templates`, `checklist_templates`, `templates`, `elder_program_templates`, `talk_themes`, `field_meeting_templates` e eventos de circuito para incluir `private.has_role(auth.uid(),'superintendent')`.
- `resolveLoginIdentifier` em `src/lib/auth.functions.ts`: deixar de retornar `email`; fazer o sign-in por telefone via server function autenticadora, com rate limit por IP/telefone.
- Nada nas telas, no cronômetro, nos esboços ou no modo offline é alterado.
