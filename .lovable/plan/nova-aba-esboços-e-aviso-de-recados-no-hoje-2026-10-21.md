# Nova aba "Esboços" e aviso de recados no "Hoje"

## O que muda (só visual, nenhum recurso novo ou removido)

### 1. Seletor com 5 abas curtas
**Hoje · Esboços · Visita · Pastoreio · Amanhã**

### 2. Aba "Esboços" (nova, entre Hoje e Visita)
O cartão "Esboços e Notas" com subabas deixa de existir e vira cartões separados, cada um com a setinha de recolher/expandir:
- **Considerações de campo**: mesma lista, mesmos toques e mesmo "Ver todos" de hoje.
- **Esboços da semana**: mesma lista e mesmo "Ver mais" de hoje.

A aba "Hoje" passa a ter só o cronograma completo do dia.

### 3. Aba "Visita"
"Reuniões da semana" passa para cá, como primeiro cartão. Depois vêm Reunião de Campo, Estudos e Revisitas, Refeições e Transporte.

### 4. Aba "Pastoreio"
A ordem fica: Pastoreiem o Rebanho de Deus, depois **"Notas do SC – Recomendados"** e por fim Checklist. O cartão Recomendados traz a mesma lista de antes, e tocar numa nota abre a mesma janela de leitura.

### 5. Aviso delicado de recados
Quando há recado da esposa não lido, aparece um pequeno ponto colorido na aba "Hoje" do seletor. Ele some quando os recados são lidos. Os leitores de tela anunciam "recados não lidos". O aviso usa a cor dos recados, sem número grande e sem animação chamativa.

### No computador
Os cartões continuam em lista única, já na nova ordem.

## O que não muda
Dados, banco, login, sincronização, modo offline, permissões, a regra de abrir recados e as telas internas de cada área.

## Detalhes técnicos
- `_app.dashboard.tsx`: extrair os 3 `TabsContent` do cartão "Esboços e Notas" para 3 `CollapsibleCard` (ids `notes-field`, `notes-week`, `notes-recommended`), reaproveitando o JSX atual e os estados `weekOutlinesPreview`/`recomendadosPreview`/`setRecomendadoOpen`. Montar a página `esbocos`, inserida depois de `hoje`. Os cartões vazios para algum perfil seguem a mesma regra de visibilidade de hoje, e uma página vazia some do seletor.
- `DashboardPager`: campo opcional `badge?: boolean` em `DashboardPage`, que mostra um ponto `bg-[var(--accent-couple)]` (token) com `sr-only`. O valor vem de `coupleUnread > 0` na aba `hoje`. A tela salva no aparelho continua por id, por isso não quebra.
- i18n pt/en/es: `dashboard.pager.tabOutlines`, `dashboard.recommendedCardTitle`, `dashboard.pager.unreadMessages`.
- Validar com `bunx tsgo --noEmit`, `bunx vitest run` e Playwright em 393px (5 abas, recolher cartões, ponto de aviso).
- Atualizar a memória do layout do Dashboard para registrar as 5 telas.
