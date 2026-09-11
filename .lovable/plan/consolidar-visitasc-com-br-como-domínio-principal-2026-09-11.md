# Consolidar `visitasc.com.br` como domínio principal

## Diagnóstico confirmado

- O aplicativo **não está restrito** a `visita-sc.lovable.app`.
- Em `src/lib/api-origin.ts`, o aplicativo instalado já tenta primeiro `https://visitasc.com.br`, depois `https://www.visitasc.com.br`, deixando `https://visita-sc.lovable.app` como última alternativa.
- O app continua executando localmente no aparelho (`webDir: dist-app` e sem `server.url`); somente as chamadas de dados usam um domínio disponível.
- CORS, navegação do Capacitor e links Android já autorizam os três endereços.
- O banco e a sessão não dependem do nome `visita-sc.lovable.app`.
- Há referências antigas e inconsistentes: a Política de Privacidade usa o domínio antigo como URL canônica, e `ANDROID_RELEASE.md`/`CAPACITOR.md` ainda descrevem uma configuração remota que já não existe.

## Ajustes seguros

1. Manter `visitasc.com.br` como origem principal para dados e `www.visitasc.com.br` como segunda opção.
2. Preservar `visita-sc.lovable.app` apenas como fallback técnico, evitando indisponibilidade caso os domínios próprios estejam temporariamente fora do ar.
3. Alterar a URL canônica da Política de Privacidade para `https://visitasc.com.br/politica-privacidade`.
4. Atualizar a documentação Android para refletir a casca local atual, a ordem real dos domínios e a ausência de `server.url`.
5. Manter os três hosts no CORS, no Capacitor e nos App Links; removê-los agora reduziria a tolerância a falhas sem trazer ganho de segurança.

## Validação

- Confirmar que não restam referências funcionais que tratem `visita-sc.lovable.app` como endereço principal.
- Verificar TypeScript e o empacotamento da casca Android.
- Validar `/api/public/ping` e chamadas do aplicativo por `visitasc.com.br` com a origem local do Capacitor.
- Confirmar que login, recuperação de senha, sincronização e troca de Wi‑Fi para 4G continuam funcionando sem recarregar ou deslogar.

## Impacto esperado

Nenhuma mudança no banco, credenciais, dados, autenticação, sincronização ou telas. O domínio próprio passa a ser a referência oficial; o endereço antigo permanece somente como proteção de contingência.
