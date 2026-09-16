# Resolver a falha de acesso do aplicativo via `visita-sc.lovable.app`

## Diagnóstico confirmado agora (11/09/2026)

1. **O DNS de `visita-sc.lovable.app` não é seu nem configurável.** Ele pertence à infraestrutura da Lovable (resolve para `185.41.148.1` / `185.41.148.2`). Não existe registro DNS que você possa criar ou corrigir no seu provedor — qualquer falha regional de rota/DNS desse endereço só pode ser corrigida pela Lovable. Ação correta: registrar um chamado no suporte da Lovable relatando a falha regional.

2. **Causa real encontrada nos testes de hoje:** `visitasc.com.br` está definido como **domínio principal**. Por isso, tanto `visita-sc.lovable.app` quanto `www.visitasc.com.br` respondem **302 (redirecionamento)** para `visitasc.com.br` — inclusive em `/api/public/ping`.
   - O redirecionamento **não carrega a autorização de acesso do aplicativo** (o 302 vem sem `access-control-allow-origin`).
   - No navegador isso funciona; no aplicativo (WebView), a chamada é bloqueada antes de chegar ao destino.
   - Resultado: dos três endereços, **somente `visitasc.com.br` funciona de verdade para o APK/AAB**. Os outros dois são contingências que nunca funcionam.

## Solução

### Parte 1 — Configuração de domínio (você executa, 1 clique)
- Em **Project Settings → Domains**, abrir o menu (⋯) de `visitasc.com.br` e escolher **"Unset as primary"** (remover como principal).
- Efeito: cada domínio passa a servir o app diretamente, sem redirecionamento. Os três endereços passam a responder 204 no `/api/public/ping` com a autorização correta — o aplicativo ganha **três contingências reais**.
- Impacto no site: nenhuma tela muda; o acesso continua funcionando nos três endereços. Apenas deixa de haver redirecionamento automático para o domínio principal.

### Parte 2 — Aplicativo (eu executo)
1. Tornar a sonda `/api/public/ping` resistente a redirecionamento: se a resposta final vier de outro domínio (`response.redirected`), adotar o destino como origem válida em vez de falhar.
2. Manter `visitasc.com.br` como primeira escolha e os demais como contingência.
3. Subir a versão para **4.1.5 (versionCode 8)** para gerar novo APK/AAB.
4. Atualizar `ANDROID_RELEASE.md`/`CAPACITOR.md` com a regra: domínio principal redireciona e quebra chamadas do app — manter sem primary ou documentar o comportamento.

### Parte 3 — Infraestrutura (fora do código)
- Abrir chamado no suporte da Lovable sobre a falha regional de acesso a `*.lovable.app` (DNS/rota `185.41.148.x`), citando que afeta dois projetos. Essa correção não depende do aplicativo.

## Validação

- `curl -H 'Origin: https://localhost'` em `/api/public/ping` nos três domínios deve responder **204 direto** (sem 302) após remover o primary.
- `bunx tsgo --noEmit` e testes de `api-origin`/`cors` passando.
- No APK: login e sincronização funcionando mesmo com `visita-sc.lovable.app` indisponível.

## O que NÃO muda

Banco de dados, login, sessão, sincronização, esboços, cronômetro e telas. Nenhum segredo ou credencial é alterado.
