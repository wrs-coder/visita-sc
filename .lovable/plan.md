# Sugestões múltiplas no aviso "Referência não encontrada"

## O que muda

1. **Até 3 sugestões de livros** — hoje o aviso mostra apenas o livro mais parecido. Passa a mostrar de 2 a 3 opções ordenadas da mais provável para a menos provável. Assim casos parecidos ficam fáceis de distinguir: "Jo 3:16" sugere João e Jó; "1Co 3:16" sugere 1 Coríntios e 1 Crônicas.
2. **Fechamento automático** — ao tocar numa das sugestões, o aviso "Referência não encontrada" fecha sozinho e o balão do versículo da sugestão abre normalmente.

## Como será feito

- A lógica de semelhança (distância entre a digitação e o nome do livro) já existe e continua a mesma; ela apenas passa a devolver as 3 melhores opções em vez de só a primeira, com o mesmo limite de tolerância que já evita falsos positivos (horários como "19:30" continuam ignorados).
- Nada muda no texto do esboço, no banco de dados, na Bíblia ou na detecção das referências corretas.

## Verificação

- Testes automáticos: "Jo" oferece João e Jó; "1Co" oferece 1 Coríntios e 1 Crônicas; termos distantes continuam sem sugestão.
- Teste no app: nota com referência errada no modo esboço e na tela cheia → o aviso mostra 2-3 opções; tocar numa opção fecha o aviso e abre o versículo.
- Conferir que referências certas, grifos, inserção no esboço e cronômetro continuam iguais.

## Detalhes técnicos

- `src/lib/bible-refs.ts`: nova função `suggestBooks()` (plural) que coleta todos os candidatos dentro do limite de distância, deduplica por livro, ordena por pontuação e devolve os 3 primeiros; `suggestBook()` passa a usá-la (mantém compatibilidade); `UnknownCitation` ganha `suggestions?: { bookId, displayName }[]` preenchido em `findUnknownCitations`.
- `src/components/bible/UnknownRefPopover.tsx`: renderiza a lista de sugestões (até 3 `VerseLink`), localizando os nomes pelo idioma da interface; o clique em qualquer sugestão chama `setOpen(false)` para fechar o aviso.
- `src/lib/bible-refs-unknown.test.ts`: novos testes de múltiplas sugestões e ordem (João antes de Jó para "Jo", etc.), mantendo os testes atuais de falsos positivos.
