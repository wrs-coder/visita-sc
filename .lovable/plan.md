# Analisador — aviso das 600 h não apareceu (Regina Ventura)

## O que aconteceu

- Ano 2026 da Regina: 64+39+25+39+61+39+38+61+43+64+41+59 = **573 h**. Ela deveria ver "⚠ (Ano anterior faltou: 27 h)".
- A correção já está no site publicado, mas o seu aparelho/navegador continuou usando a **cópia antiga guardada para funcionar sem internet**. Hoje o Analisador abre primeiro a cópia guardada e só usa a versão nova na vez seguinte. Por isso nada mudou na tela.
- A regra já usa os dois cartões inteiros (2026 e 2027), não só os 6 meses selecionados. Isso vai ser confirmado com um teste usando exatamente as horas da Regina.

## O que muda

1. **Sempre buscar a versão mais nova quando houver internet.** Os arquivos do Analisador passam a vir primeiro da internet (com limite de poucos segundos); a cópia guardada só é usada sem internet. Assim, uma correção aparece já na próxima abertura.
2. **Teste com os dados da Regina:** cartão 2026 (573 h) + cartão 2027 (set 50 h, out 36 h), vendo o ano 2027 com o período de 6 meses → o card deve mostrar "⚠ (Ano anterior faltou: 27 h)" e os meses de 2026 abaixo de 50 h: Out 39, Nov 25, Dez 39, Fev 39, Mar 38, Mai 43, Jul 41.
3. Conferir na tela (Playwright) importando esses dois cartões e abrindo a aba Pioneiros regulares.

Como fica o card:

```text
Regina Ventura Eduardo Pedro >        ⚠ −3 h
Feitas 97 h · Meta até agora 100 h
Média 48,5 h/mês · precisa 51 h/mês até agosto
┌─────────────────────────────────────┐
│ ⚠ (Ano anterior faltou: 27 h)       │
│ Meses do ano anterior abaixo de 50h │
│ Out 2025 39 h · Nov 2025 25 h ...   │
└─────────────────────────────────────┘
│ Abaixo de 50 h: Out 2026 36 h       │
```

Para ver já agora, sem esperar: feche todas as abas do Analisador e abra de novo (ou recarregue duas vezes).

## Detalhes técnicos

- `public/ferramentas/Analisador/sw.js`: trocar o cache-first (stale-while-revalidate) dos arquivos por network-first com timeout de ~3 s e fallback ao cache; subir `CACHE` para `analisador-v6`.
- `index.html`: adicionar `?v=` nos `<script>` de `analyzer.js`/`app.js` e manter os caminhos na lista do SW (normalizar ignorando a query).
- Novo caso em `ferramentas-testes/analisador-inicio-pr.test.ts` com as horas da Regina; teste offline existente continua passando.
- Nada no Visita SC é alterado.
