# Dois arquivos de instruções: VisitaSC e Ferramentas do site

## Resposta curta
Sim, é melhor. Hoje o instructions.md fala só do aplicativo e não cita o Conversor S-21 nem o Analisador. Com dois arquivos, cada pedido segue as regras certas:
- Ajuste no app → instructions.md.
- Ajuste nas ferramentas → instructions-ferramentas.md.

Assim, por exemplo, mudar o Conversor nunca vai trocar a versão do app nem mexer na Ajuda.

## Como fica
```text
 instructions.md (VisitaSC)          instructions-ferramentas.md
 - regras do app (1 a 30)            - regras das ferramentas
 - nova linha: "Ferramentas do       - cópia das regras comuns
   site seguem o outro arquivo"        (prévia ASCII, plano antes,
                                        validação, escopo cirúrgico)
```
O arquivo novo fica na raiz do projeto, fora do site. Ninguém de fora consegue abri-lo.

## Conteúdo do instructions-ferramentas.md
1. **O que são:** páginas avulsas em /ferramentas/S21_Export/ e /ferramentas/Analisador/, sem login, sem banco de dados, com tudo processado no aparelho.
2. **Onde ficam:** o código fica só em `public/ferramentas/` e os testes em `ferramentas-testes/`. Uma única rota entrega as páginas.
3. **Proibido:** mexer em `src/`, na versão do app, nas notas de versão ou na Ajuda do app. As ferramentas nunca entram no APK nem no modo sem internet.
4. **Regras copiadas do app (quase iguais):**
   - Mockup ASCII de celular antes de qualquer mudança de tela, com referência iOS/One UI.
   - Plano em português e aprovação antes de executar.
   - Escopo cirúrgico.
   - Nada fora do campo de visão do usuário nem escondido sob as barras do Android.
   - Testar num celular simulado.
5. **Validação:** rodar os testes de `ferramentas-testes/`, incluindo a trava de isolamento.
6. **Commits:** salvos à parte, com o nome começando por "ferramentas:".
7. **Regras de negócio já combinadas:**
   - "2025/2026" vale 2026, e "2026/2027" vale 2027.
   - Publicador comum que participou recebe 1 hora só no arquivo do Hourglass; na tela aparece "—".
   - Pioneiro regular leva "Regular" na planilha.
   - A aba validation tem 6 itens e vem oculta.
   - Os três formatos de exportação (Hourglass, TSWin e Circuit Manager) seguem os modelos enviados.
   - No Analisador, o período padrão é de 6 meses e pode juntar cartões de dois anos.
   - Pioneiros regulares são analisados à parte.
   - Pastas viram grupos.
   - Tocar num nome abre o cartão mês a mês.

## No instructions.md (app)
Só acrescentar uma linha no topo: "As Ferramentas do site (Conversor S-21 e Analisador) seguem instructions-ferramentas.md; as regras 15 (versão) e 30 (Ajuda) não se aplicam a elas." Nenhuma outra regra muda.

## Técnico
- Criar `instructions-ferramentas.md` e acrescentar uma linha no `instructions.md`.
- A trava de isolamento passa a conferir também que o arquivo novo existe.
- Conferir que `instructions-rules.test.ts` e os testes das ferramentas continuam passando.
