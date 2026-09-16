# Corrigir aviso de renderização (hydration) na tela de login

## O que está acontecendo

O console mostra um aviso do React: o HTML gerado no servidor não bate com o que o navegador monta. A causa já foi localizada e confirmada:

- O arquivo `src/lib/theme.ts` aplica o tema (claro/escuro) assim que o app carrega, **antes** da hidratação do React. Isso adiciona `style="color-scheme: light"` (e a classe `dark`, quando aplicável) na tag `<html>`.
- O HTML vindo do servidor não tem esse atributo, então o React emite o aviso de "hydration mismatch".

Impacto: **nenhum problema visível** — o tema funciona corretamente. É apenas um aviso de console. Mas vale corrigir para manter o console limpo e evitar mascarar erros futuros.

## Correção (padrão de mercado)

Adicionar `suppressHydrationWarning` na tag `<html>` do `RootShell` em `src/routes/__root.tsx` (linha 101).

É exatamente o padrão recomendado (mesmo usado por bibliotecas como next-themes) quando o `<html>` é propositalmente modificado por script antes da hidratação — que é o nosso caso, de forma intencional para evitar "flash" de tema.

## Verificação

1. Abrir o preview com Playwright e confirmar que o aviso sumiu do console.
2. Confirmar que a troca de tema claro/escuro continua funcionando.
3. Garantir `bunx tsgo --noEmit` e build OK.

## Detalhes técnicos

- Arquivo alterado: apenas `src/routes/__root.tsx` (1 linha: `<html lang="pt-BR" suppressHydrationWarning>`).
- Nenhuma mudança de comportamento, tema, banco ou versão do app.
