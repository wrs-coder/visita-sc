# Blindagem: Conversor S-21 e Analisador nunca afetam o VisitaSC

## Como está hoje (já separado)
- Os arquivos ficam só em `public/ferramentas/` (S21_Export e Analisador).
- O APK (Play Store) já remove essa pasta ao empacotar; o modo offline do app (sw.js) ignora `/ferramentas/`.
- Não usam login, banco de dados nem código do app.

## Pontos de contato que ainda existem
1. Duas pequenas rotas do site (`src/routes/ferramentas.*.ts`) que entregam a página.
2. Dois arquivos de teste dentro da pasta de testes do app (`src/lib/s21-converter.test.ts`, `congregation-analyzer.test.ts`).
3. Nenhuma trava automática: se alguém (eu inclusive) importar algo das ferramentas dentro do app, nada avisa.

## O que proponho
```text
 VisitaSC (app + APK)        |   Ferramentas (só site)
 src/  ── nunca importa ──X──|   public/ferramentas/
 sw.js ── ignora ────────────|   testes próprios
 APK   ── remove pasta ──────|   regra escrita no AGENTS
```
1. **Trava automática (teste guardião):** um teste que falha se qualquer arquivo do app (`src/`) importar algo de `public/ferramentas/`, se o sw.js passar a guardar `/ferramentas/`, ou se o APK empacotado contiver a pasta.
2. **Testes das ferramentas mudam de casa:** vão para `public/ferramentas/_testes/` fora da pasta do app (o roteiro de testes continua rodando-os). Ficam excluídos do site e do APK.
3. **Rotas mínimas e congeladas:** as duas rotas viram uma só genérica (`/ferramentas/$ferramenta`) que só lê HTML da pasta; nunca toca no app.
4. **Regra escrita:** no AGENTS.md, “Ajustes em ferramentas só alteram `public/ferramentas/`; nunca editar `src/`, versão, notas de versão ou Ajuda do app junto”. Assim, pedidos sobre o Conversor/Analisador não sobem a versão do app nem geram “O que há de novo”.
5. **Commits separados:** cada ajuste das ferramentas num commit próprio com prefixo “ferramentas:”, fácil de desfazer sem tocar no app.

## Resultado para você
- Você pode pedir ajustes no Conversor e no Analisador à vontade; o app no celular e a Play Store não mudam.
- Se algo tentar misturar os dois, o teste guardião acusa antes de salvar.

## Técnico
- Guard test: vitest varrendo `src/**` por `ferramentas/`, lendo `public/sw.js` e `scripts/build-app-shell.mjs`.
- vitest `include` passa a abranger `public/ferramentas/_testes/**`; build-app-shell e headers do site bloqueiam `_testes`.
- Nenhuma mudança visual.
