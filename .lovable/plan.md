# Registrar as Ferramentas do site no instructions.md

## Resposta curta
Não. Hoje o instructions.md fala só do aplicativo VisitaSC. As regras de separação estão só nas notas técnicas, numa linha curta. Ele não cita o Conversor S-21 nem o Analisador em nenhum lugar.
Além disso, duas regras do app poderiam ser aplicadas por engano às ferramentas:
- Regra 15 (Versão): trocar a versão do app.
- Regra 30 (Ajuda): pôr na Ajuda do app.

## O que proponho
Acrescentar ao instructions.md uma nova seção **"31. Ferramentas do site (Conversor S-21 e Analisador)"**, com:

1. **O que são:** páginas avulsas em visitasc.com.br/ferramentas/S21_Export/ e /ferramentas/Analisador/, sem login, sem banco de dados, com tudo processado no aparelho.
2. **Onde ficam:** o código fica só em `public/ferramentas/` e os testes em `ferramentas-testes/`. Uma única rota entrega as páginas.
3. **Proibições:** ajustes nas ferramentas nunca alteram `src/`, a versão do app (regra 15), as notas de versão nem a Ajuda do app (a regra 30 não se aplica). Elas nunca entram no APK nem no modo sem internet.
4. **Validação:** antes de finalizar, rodar os testes de `ferramentas-testes/`, incluindo a trava de isolamento.
5. **Commits:** cada ajuste é salvo à parte, com o nome começando por "ferramentas:".
6. **Regras de negócio já combinadas** (para eu não esquecer):
   - "2025/2026" vale 2026, e "2026/2027" vale 2027.
   - Publicador comum que participou recebe 1 hora só no arquivo do Hourglass. Na tela aparece "—".
   - A aba validation do Hourglass tem 6 itens e vem oculta.
   - No Analisador, o período padrão é de 6 meses e pode juntar cartões de dois anos.
   - Pioneiros regulares são analisados à parte.
   - Pastas viram grupos.
7. **Prévia de tela:** mudanças visuais nas ferramentas também seguem a regra 26 (mockup ASCII antes de mudar).

Também incluo no item 1 da regra 30 a frase: "não se aplica às Ferramentas do site (seção 31)".

## Técnico
- Editar só o `instructions.md`: adicionar a seção 31 e uma linha na seção 30.
- Conferir que `instructions-rules.test.ts` continua passando (a lista de arquivos protegidos não muda).
