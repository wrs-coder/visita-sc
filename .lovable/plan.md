# Alinhar versões dos pacotes TipTap

## O que aconteceu

O `package.json` declara os pacotes `@tiptap/*` com `^` (ex.: `^3.23.6`), que permite instalar versões mais novas automaticamente. Com o tempo, o gerenciador de pacotes resolveu versões diferentes para cada pacote. Hoje estão instaladas três versões misturadas:

- **3.23.6** — maioria dos pacotes (core, react, starter-kit, pm etc.)
- **3.24.0** — font-family, link, subscript, superscript, table*, task-*, text-align, underline
- **3.26.0** — character-count, focus, typography

O TipTap exige que todos os pacotes estejam na **mesma versão**. Versões misturadas podem causar comportamentos estranhos no editor dos esboços (duplicação de extensões, marcas que não aplicam, erros silenciosos). O aviso do VS Code está correto.

## O que será feito

1. **Fixar a versão exata** de todos os pacotes `@tiptap/*` no `package.json`: trocar `^3.23.6` / `^3.24.0` por `3.23.6` (sem o `^`), para que nunca mais instalem versões diferentes entre si.
2. **Reinstalar** as dependências para que todos os pacotes TipTap fiquem exatamente em `3.23.6` (a versão da maioria, já testada e em uso no app publicado).
3. **Validar**:
   - `bunx tsgo --noEmit` (verificação de tipos)
   - `bunx vitest run` (189 testes)
   - Conferir que as versões instaladas ficaram todas em 3.23.6
   - Abrir o editor de esboços no navegador e confirmar que formatação, tópicos recolhíveis e anexos continuam funcionando

## Por que 3.23.6 e não a mais nova

- É a versão do núcleo (core, react, starter-kit) já em produção.
- Subir tudo para 3.26.0 traria mudanças não testadas no editor — risco desnecessário agora.
- Fixar sem `^` impede que o problema volte a acontecer em instalações futuras.

## O que não muda

- Nenhuma linha de código do editor, dos esboços ou de qualquer tela.
- Nenhum dado, anexo, Bíblia ou configuração.
- A versão do aplicativo (4.2.14) não é alterada por este ajuste.

## Riscos

- **Baixo.** É a versão que já roda hoje na maior parte do editor; apenas os 13 pacotes que "escaparam" para 3.24.0/3.26.0 voltam para 3.23.6. A validação com testes e com o editor aberto confirma que nada quebrou.
