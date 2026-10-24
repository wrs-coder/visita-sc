# Botão voltar do celular e detalhes de cada evento no Pastoreio

## 1. Botão voltar não fecha mais o aplicativo
Hoje o app instalado não trata o botão voltar do Android: quando há um popup ou tela cheia aberta, o sistema fecha o app inteiro.

Novo comportamento, nesta ordem:
1. Se houver popup, menu, gaveta ou tela cheia aberta: fecha só ele.
2. Senão, se houver página anterior no app: volta para ela.
3. Na tela inicial (painel ou login): primeiro toque mostra "Toque novamente para sair"; segundo toque em até 2 s fecha.

Vale para superintendente, anciãos e esposa. Só no app instalado; o site não muda.

## 2. Pastoreio: popup de cada evento
No card "Pastoreiem o Rebanho de Deus", tocar num item (família, pessoa, recomendação ou assunto) abre um popup só com as informações dele (os mesmos campos mostrados hoje no "ver todos"). O botão do olho continua abrindo todos juntos.

## Detalhes técnicos
- Novo `src/lib/native-back-button.ts`, registrado uma vez no `__root.tsx`: `App.addListener("backButton")` de `@capacitor/app` (já instalado). Para fechar camadas, despacha `Escape` no `document` quando existir `[role=dialog][data-state=open]`, `[data-radix-popper-content-wrapper]` ou elemento marcado `data-back-closable` (telas cheias próprias recebem esse atributo e um listener de Escape se ainda não tiverem). Senão `window.history.length > 1` → `router.history.back()`; senão duplo toque com toast → `App.exitApp()`.
- Dashboard: extrair a montagem de `heading/rows` do diálogo existente para uma função compartilhada; itens da lista viram botões que definem `selectedElderItem`; um `DayDetailsDialog` extra exibe esse item.
- Teste vitest da regra de decisão do voltar (camada aberta → fecha; histórico → volta; raiz → pede confirmação).
- Exige novo APK/AAB para o item 1.
