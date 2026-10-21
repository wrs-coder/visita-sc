# Verificação antes de gerar o AAB 5.0.0

## O que já foi conferido agora
- Código: compila sem erros.
- Testes automáticos: 231 de 231 passaram.
- Versão: 5.0.0 / código 28 igual no app e no Android.
- iOS / iPad: o projeto não tem pacote iOS. No iPhone e no iPad o app funciona só pelo navegador (PWA).
- Segurança do banco: 1 aviso e 2 alertas menores (veja abaixo). Nenhum deles impede gerar o AAB.

## Avisos de segurança encontrados
1. **Registro de exclusões da sincronização**: qualquer pessoa conectada consegue ler a lista de itens apagados. A lista tem só o nome da tabela e um código interno, sem nomes, textos ou telefones. Risco baixo.
2. **Duas funções especiais do banco** podem ser chamadas diretamente (uma até sem login). Preciso confirmar quais são e se isso é intencional (ex.: verificar a senha da aba dos anciãos).

Como a regra do projeto é **não alterar banco/regras de acesso**, só vou corrigir esses pontos se você autorizar.

## O que vou fazer depois que você aprovar
1. Abrir o app no tamanho do celular, do tablet e do computador, nos temas claro, escuro e preto, e tirar fotos das telas principais (painel com as 5 abas, menu lateral, esboços, cronômetro, telas cheias).
2. Gerar a pasta do aplicativo Android e conferir se todos os arquivos que a página inicial pede estão dentro do pacote (evita tela preta/branca).
3. Conferir o funcionamento como PWA (instalação e sem internet).
4. Identificar as duas funções do aviso 2 e dizer se são seguras.
5. Entregar um relatório: pronto / não pronto para gerar o AAB, com qualquer problema achado.

## Detalhes técnicos
- Checagens: `tsgo --noEmit` limpo, `vitest run` 231/231, scan `lov_pgscan` (RLS tautológica em `sync_tombstones` SELECT), linter 0028/0029 em SECURITY DEFINER.
- Etapa 2: `npm run app:package` em /tmp e validação de `/assets/*` referenciados em `dist-app/index.html`.
- Etapa 1/3: Playwright em 393x733, 820x1180 e 1280x1800; `sw.js` registrado só fora do nativo.
- Correção opcional (só com autorização): política de `sync_tombstones` restrita a linhas de tabelas acessíveis ao usuário; `REVOKE EXECUTE` de anon na função sinalizada se não for necessária.
