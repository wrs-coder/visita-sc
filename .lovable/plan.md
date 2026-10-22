# Botão "Detalhes" somente leitura na Consideração de Campo

## Objetivo
Um botão discreto (ícone de informação) no esboço da subaba "Consideração de Campo", no modo esboço e na tela cheia, que abre uma janela só para ler Data, Período, Título, Oração, Território e Ajudantes.

## Como não quebrar nada
1. **Só acrescentar, não remover.** Nesta primeira rodada os campos de preenchimento continuam onde estão. O botão é um atalho novo. Depois de você aprovar no uso real, uma segunda rodada (opcional) recolhe esses campos atrás de "Editar detalhes".
2. **Somente leitura de verdade.** A janela só mostra o que já está salvo. Ela não grava, não muda e não adiciona nada ao salvamento, à sincronização ou ao modo sem internet.
3. **Cronômetro e tela cheia intactos.** A janela abre por cima da tela cheia e fecha com X, com o botão "Voltar" do celular ou tocando fora. O cronômetro continua contando e o esboço fica no mesmo ponto.
4. **Campos vazios somem.** Mesmo padrão dos cartões do painel: um título por informação, e o que estiver em branco não aparece.
5. **Mesmo visual de hoje.** São usadas as cores, os cantos e as fontes que o app já tem, então tudo funciona no modo claro, escuro e preto puro, no celular e no computador.
6. **Nada fora da tela.** Login, PIN, biometria, Bíblia, banco de dados, PDFs e as outras subabas ficam iguais.

## Verificação
- Teste automático: a janela mostra só os campos preenchidos, e um esboço sem dados mostra o aviso "Sem detalhes".
- Rodar todos os testes e a verificação de código.
- Abrir com sua conta no tamanho de celular e de computador: abrir um esboço, tocar no botão, ver os dados, fechar; repetir na tela cheia com o cronômetro rodando.

## Detalhes técnicos
- Novo `src/components/notes/FieldNoteInfoButton.tsx`: botão `ghost` `h-8 w-8 rounded-full` com ícone `Info` e `aria-label`; reaproveita `DayDetailsDialog` + `InfoList` (já existem).
- Recebe os valores já carregados como props; nenhuma consulta nova e nenhum estado novo de dados.
- Inserido no cabeçalho do modo esboço em `src/routes/_app.consideracoes-campo.tsx` e na barra de `src/components/dashboard/FieldNoteFullscreenDialog.tsx`, com z-index acima da tela cheia.
- Textos i18n em pt/en/es, com `defaultValue`.
