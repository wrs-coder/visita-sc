# DIRETRIZES OBRIGATÓRIAS - FERRAMENTAS DO SITE (Conversor S-21 e Analisador)

Este arquivo vale só para as ferramentas do site. O aplicativo VisitaSC segue o `instructions.md`.

## 1. O que são
- Páginas avulsas em visitasc.com.br/ferramentas/S21_Export/ (Conversor S-21) e /ferramentas/Analisador/ (Analisador de congregações).
- Não têm login nem banco de dados e não usam a nuvem. Todo o processamento acontece no aparelho de quem usa.

## 2. Onde ficam
- O código fica só em `public/ferramentas/` e os testes só em `ferramentas-testes/`.
- Uma única rota do site entrega as páginas: `src/routes/ferramentas.$ferramenta.ts`. Ela só lê o HTML e nunca importa nada do app.

## 3. Proibido
- Alterar `src/` (salvo a rota acima), a versão do app, as notas de versão ("O que há de novo") ou a Ajuda do app. As regras 15 e 30 do `instructions.md` não se aplicam aqui.
- Colocar as ferramentas no APK/AAB ou no modo sem internet (`public/sw.js` ignora `/ferramentas/` e `build-app-shell.mjs` remove a pasta).
- Usar Bíblia ou qualquer dado do app.

## 4. Regras de trabalho (iguais às do app)
- Antes de qualquer mudança de tela, mostrar uma prévia: mockup ASCII simulando o celular, com referência visual iOS/One UI.
- Apresentar o plano completo em português e aguardar a aprovação antes de executar.
- Escopo cirúrgico: mexer só no que foi pedido, sem refatorar código que funciona.
- Nenhum botão pode ficar fora do campo de visão nem embaixo das barras do Android.
- Testar num celular simulado (393×687) antes de dizer que está pronto e informar o que não foi testado.
- Usar linguagem simples nas respostas, porque o usuário não é programador.

## 5. Validação obrigatória
- Rodar `bunx vitest run ferramentas-testes`. Isso inclui `isolamento.test.ts`, a trava que impede misturar as ferramentas com o app.
- Ao mudar uma regra de negócio, criar ou atualizar o teste correspondente.

## 6. Commits
- Cada ajuste das ferramentas vai num commit próprio, com o nome começando por "ferramentas:".

## 7. Regras de negócio combinadas
- **Ano do cartão:** vale o último ano escrito. "2025/2026", "25/26" e "25/6" valem 2026 (set/2025 a ago/2026). "2026/2027" vale 2027.
- **Horas:** contam para pioneiro regular e para pioneiro auxiliar nos meses marcados.
- **Hourglass:** no arquivo, o publicador comum que participou recebe 1 hora; na tela de conferência aparece "—".
- **Planilha Hourglass:**
  - o mês vai como data do Excel (yyyy-mm);
  - o pioneiro regular leva "Regular" na coluna pioneer;
  - as células vazias vão vazias de verdade;
  - a aba validation traz os 6 itens (Baptized Publisher, Regular Pioneer, Continuous Auxiliary Pioneer, Unbaptized Publisher, Student Only, Special Pioneer) e vem oculta.
- **Exportações:** Hourglass (.xlsx), TSWin (Active.xml) e Circuit Manager (.json) seguem exatamente os modelos enviados (mesmos campos, mesma ordem). Uma exportação nunca altera a outra.
- **Totais para conferência:** antes de gerar o arquivo, mostrar os totais de pioneiros regulares, anciãos e servos ministeriais.
- **Analisador:**
  - Período padrão de 6 meses. Ele pode atravessar dois anos de serviço, juntando os cartões da mesma pessoa. Também há o ano inteiro ou De/Até.
  - Pioneiros regulares são analisados à parte, não por grupo.
  - Os grupos aparecem em pílulas lado a lado.
  - Na importação de pastas, cada subpasta vira um grupo; pasta com "pioneiro" no nome vai para Pioneiros reg.
  - Um cartão pode ser atualizado importando o S-21 de novo.
  - As anotações ficam ligadas ao resumo de cada grupo, além das anotações gerais.
  - Tocar num nome abre o cartão mês a mês.

### Analisador — regras combinadas (24/11/2026)
- Inativo: palavra "inativo" em qualquer parte do cartão (ou pasta "Inativos") ou 6+ meses seguidos sem pregar até o último mês com relatório. Fica no grupo "Inativos", fora dos grupos de campo, e volta ao grupo de origem ao recalcular.
- Perigo de ficar inativo: 4 ou 5 meses seguidos sem pregar (alerta, continua no grupo).
- Datas de qualquer formato (inclusive por extenso) viram dd/mm/aaaa; data não entendida vira aviso.
- Resumos só mudam ao tocar "Aplicar mudanças" ou "Recalcular dados". Tudo fica guardado no aparelho; só "Limpar tudo" apaga.
- Meta dos pioneiros mostra os meses abaixo de 50 h com horas e observação.
