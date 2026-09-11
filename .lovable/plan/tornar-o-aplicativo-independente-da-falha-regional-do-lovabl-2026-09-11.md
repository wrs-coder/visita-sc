# Tornar o aplicativo independente da falha regional do `lovable.app`

## Diagnóstico confirmado

- `ebcadvocacia.lovable.app` e `visita-sc.lovable.app` resolvem para os mesmos endereços da infraestrutura Lovable (`185.41.148.1`, `185.41.148.2` e equivalentes IPv6).
- `visitasc.com.br` responde diretamente ao teste do aplicativo com HTTP 204 e autorização correta.
- `www.visitasc.com.br` e `visita-sc.lovable.app` estão configurados para redirecionar ao domínio principal `visitasc.com.br`; no navegador isso funciona, mas o aplicativo não deve depender desse redirecionamento para decidir se está conectado.
- Nos testes externos desta sessão, os dois endereços `lovable.app` responderam HTTP 200. Isso descarta uma queda mundial, mas é compatível com falha regional de rota, DNS ou filtragem entre determinada operadora/rede e a infraestrutura Lovable.
- O banco de dados e a autenticação já foram verificados como saudáveis; eles não são a origem do bloqueio.

## Solução no Visita SC

1. Manter o aplicativo executado localmente no aparelho, sem navegar para um site remoto.
2. Usar `visitasc.com.br` como primeiro caminho para dados, pois responde diretamente sem redirecionamento.
3. Manter `www.visitasc.com.br` como segunda opção e `visita-sc.lovable.app` apenas como última alternativa; a indisponibilidade isolada de qualquer um nunca poderá declarar o aplicativo offline.
4. Usar exclusivamente `/api/public/ping` para verificar disponibilidade, evitando o falso erro causado pelo arquivo estático sem autorização de leitura pelo aplicativo.
5. Testar os três caminhos em paralelo, escolher o primeiro funcional e memorizar a escolha no aparelho.
6. Mostrar “Sem conexão com o servidor” somente quando todos os caminhos falharem duas vezes consecutivas; repetir automaticamente e remover o aviso quando qualquer caminho voltar.
7. Validar a versão 4.1.3 (código 6), publicar o servidor e só depois gerar um novo APK/AAB.

## Validação final

- Confirmar resposta final 204 e autorização para o aplicativo em `/api/public/ping`; registrar também quais endereços respondem diretamente e quais redirecionam ao domínio principal.
- Confirmar que a compilação e a casca Android passam sem arquivos ausentes.
- Testar abertura e troca entre Wi‑Fi e 4G com `visita-sc.lovable.app` indisponível, comprovando que o aplicativo continua pelos domínios próprios.
- Registrar a falha dos dois projetos com o suporte da Lovable como problema regional de acesso aos endereços `lovable.app`; essa correção de infraestrutura não depende de mudanças no aplicativo.

Nenhuma mudança será feita no banco, login, sincronização, dados offline, esboços ou cronômetro.
