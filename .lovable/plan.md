# Termos de Uso do Visita SC: o que vale a pena incluir

## Avaliação de cada ponto

| Ponto | Incluir? | Por quê / ajuste |
|---|---|---|
| 1. Aceitação e titular | **Sim** | Hoje os termos não dizem quem responde pelo app nem como entrar em contato. Incluir o nome "desenvolvedor individual independente" e o e-mail wrscircuito@gmail.com. |
| 2. Ferramenta não oficial, sem afiliação | **Sim, é o mais importante** | O app cita JW Library, Tradução do Novo Mundo e importa arquivos dessas fontes. Deixar claro que não tem ligação com a organização protege você e evita confusão. |
| 3. Finalidade | **Sim, juntando com a seção 1 atual** | Corrigir "para fazer organizar" e manter quem usa o app: superintendente, anciãos e esposa. Manter a frase "não fornece conteúdo doutrinário nem substitui publicações oficiais". |
| 4. Conteúdos de terceiros | **Sim, com um ajuste** | Acrescentar que a Bíblia e as anotações do JW Library **vêm de arquivos que o próprio usuário importa no aparelho**, e que o app não distribui nem inclui esses textos. Isso corresponde ao funcionamento real e reforça a proteção. |
| 10. Uso permitido | **Sim, junto com a seção 4 atual (Uso adequado)** | Acrescentar a proibição de copiar em massa ou redistribuir os textos exibidos. |
| 11. Garantias e responsabilidade | **Sim, junto com a seção 6 atual (Disponibilidade)** | Tom equilibrado e respeita o Código de Defesa do Consumidor. Acrescentar: "faça backups; o desenvolvedor não responde por perda de dados guardados só no aparelho". |
| 12. Alterações | **Sim, em versão simples** | Hoje o app não pede um novo aceite quando os termos mudam. Proposta: avisar as mudanças importantes no "O que há de novo" e mostrar a data da versão em vigor no topo da página. Um novo aceite obrigatório pode ficar para depois, se você quiser. |
| 13. Lei aplicável e foro | **Sim** | Lei brasileira, sem arbitragem obrigatória, e o consumidor mantém os direitos do lugar onde mora. Isso é adequado também para usuários de Angola e de outros países. |

Observação: o texto que você enviou pula da seção 4 para a 10. Na versão final, a numeração fica corrida.

## Estrutura final proposta (12 seções)

```text
1.  Quem somos e aceitação            (novo: titular + contato)
2.  Ferramenta independente           (novo: sem afiliação, marcas)
3.  Finalidade                        (atual 1 + ponto 3)
4.  Sua conta                         (atual 2, sem mudança)
5.  Dados de outras pessoas           (atual 3, sem mudança)
6.  Uso adequado                      (atual 4 + ponto 10)
7.  Conteúdo pessoal e backups        (atual 5, sem mudança)
8.  Conteúdos de terceiros            (novo: ponto 4 + arquivos importados pelo usuário)
9.  Disponibilidade e responsabilidade(atual 6 + ponto 11)
10. Privacidade                       (atual 7, sem mudança)
11. Alterações                        (atual 8 + aviso no app e data da versão)
12. Lei aplicável                     (novo: ponto 13)
     "Última atualização: 30/10/2026"
```

## Prévia na tela (celular)

```text
┌────────────────────────────┐
│ ✕                 Visita SC│
│ 📄 Termos de Uso           │
│ Última atualização 30/10/26│
│                            │
│ 1. Quem somos e aceitação  │
│ O Visita SC é desenvolvido │
│ por um desenvolvedor inde- │
│ pendente. Contato: wrs...  │
│                            │
│ 2. Ferramenta independente │
│ Não é afiliado à Watch     │
│ Tower... nem a entidade    │
│ ligada às Testemunhas...   │
│ ...                        │
└────────────────────────────┘
```

## O que não muda
- Telas de login, cadastro e aceite: o mesmo texto aparece onde já aparece hoje.
- Política de Privacidade: continua separada, só é mencionada nos termos.
- Nenhum dado, conta ou banco de dados é alterado.

## Detalhes técnicos
- Atualizar só `TERMS_SECTIONS` em `src/components/auth/terms-content.tsx` e acrescentar uma linha com a data de atualização em `TermsContent`. A página `/termos-uso` e os outros lugares que usam o componente passam a mostrar o novo texto automaticamente.
- Ajustar a descrição em `head()` de `/termos-uso` para mencionar o aviso de ferramenta não oficial.
- Opcional: incluir uma linha no "O que há de novo" da próxima versão: "Termos de Uso atualizados".
- Teste simples: confirmar que os termos contêm o e-mail de contato e a cláusula de não afiliação.
