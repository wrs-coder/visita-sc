# Ajustes: aviso de pendências, Painel na prontidão e Lembretes

## 1. Painel no "Pronto para ficar sem internet"
Hoje a lista mostra só Itinerário, Congregações, Esboços, Modelos e Grandes Eventos. Entra a linha **"Painel da visita"**, que confere se refeições, campo, transporte, checklist e reuniões da visita atual estão guardados no celular.

## 2. Balão amarelo sai do topo
Hoje o balão ("1 pendente(s) · tocar para enviar", "Sem internet", etc.) flutua no topo e cobre Ajuda e Sincronizar.

**Superintendente e anciãos:** vai para o menu lateral, ao lado do botão do modo escuro.

```text
ANTES (topo)                     DEPOIS (menu lateral aberto)
+-----------------------------+  +---------------------------+
| ☰  Cabiri  [1 pendente] ? ⟳ |  | Wanderson · Circuito      |
|        ^ cobre os botões    |  |---------------------------|
+-----------------------------+  | [☾ Preto ] [⚠ 1 pendente ]|
                                 |            [ Tocar enviar]|
                                 |---------------------------|
                                 | Painel                    |
                                 | Itinerário ...            |
                                 +---------------------------+
```
- O botão ☰ ganha uma bolinha amarela discreta quando houver pendência.
- Tocar no cartão envia as pendências, como hoje.

**Esposa:** o balão sai do topo e vai para o painel "Pastas e Configurações", como uma linha de aviso só informativa (sem toque, já que lá não há envio).

```text
+---------------------------+
| Pastas e Configurações    |
|---------------------------|
| ⚠ Sem internet            |
|   Seus dados estão salvos |
|   neste aparelho.         |
|---------------------------|
| 📁 Pastas ...             |
| ☾ Tema ...                |
+---------------------------+
```

## 3. Lembretes com recolher/expandir em cada bloco
Cada bloco dos Lembretes (Antecedência, Tipos de evento, Horário silencioso, Dias, etc.) ganha a seta ⌃/⌄, no mesmo estilo dos outros cartões. Recolher só esconde; nada configurado é perdido. O app lembra o que ficou recolhido neste aparelho.

```text
+-----------------------------+
| 🔔 Lembretes de eventos   ⌃ |
|-----------------------------|
| Antecedência            ⌄  |
| Tipos de evento         ⌃  |
|   Refeições        [ON ]   |
|   Saída de campo   [ON ]   |
| Horário silencioso      ⌄  |
+-----------------------------+
```

Sem mudança no banco, no login ou na versão.

## Detalhes técnicos
- `SyncStatusCard.tsx`: nova área `dashboard` em `READY_AREAS` (meals, field_meetings, field_assignments, transport_schedule, checklist_items, schedule_events e tabelas de reuniões).
- `OfflineStatusBar.tsx`: variantes `inline` (com ação de envio, usada em `_app.tsx` ao lado de `ThemeToggle variant="sidebar"`) e `info` (sem ação, usada no painel "Pastas e Configurações" do `GuestWorkspace.tsx`/`visitante.painel.tsx`); a versão flutuante deixa de ser renderizada.
- Bolinha no botão ☰ lendo o mesmo contador de pendências.
- `EventReminders.tsx`: cada seção envolvida pelo componente de `collapsible-blocks.tsx` (estado em localStorage, conteúdo escondido, nunca desmontado).

---

## 4. Sincronizar um esboço por vez
Hoje, ao arrastar um esboço, o app marca esse esboço e depois sincroniza **todos** os esboços. Passa a agir só no esboço arrastado:

- **Arrastar para a esquerda (verde) = Enviar:** manda só este esboço para a nuvem.
- **Arrastar para a direita (azul) = Receber:** baixa só este esboço da nuvem e substitui a cópia do celular.
- Se o esboço tiver alterações ainda não enviadas, o Receber pergunta antes ("Substituir sua versão do celular?").
- Sem internet: aviso "Sem internet, tente quando houver conexão" (nada é perdido).
- **No site/PWA:** os três pontinhos de cada esboço ganham "Enviar para a nuvem" e "Receber da nuvem".

```text
Arrastar ←  (Enviar)                Arrastar →  (Receber)
+---------------------------+      +---------------------------+
| Esboço 12 - Fé  |▓ ⬆ Enviar|      |⬇ Receber ▓| Esboço 12 - Fé|
+---------------------------+      +---------------------------+
          verde                              azul

Site/PWA  (⋯ ao lado do esboço)
+---------------------------+
| Renomear                  |
| Mover                     |
| ⬆ Enviar para a nuvem     |
| ⬇ Receber da nuvem        |
+---------------------------+
```

### Detalhes técnicos (4)
- `SwipeToSync.tsx`: dois lados (`onPush` à esquerda com `bg-success`, `onPull` à direita com `bg-primary`), continua só toque para não atrapalhar o arrastar com mouse.
- `OutlinesWorkspace.tsx`: `swipeSyncNote` deixa de chamar `syncOutlinesIfOnline()`; usa `pushOutlineToCloud` e `pullOutlineFromCloud` apenas com o id do esboço (funções já existentes) e limpa o `dirty` só desse esboço. Mesmas ações adicionadas ao menu ⋯ da nota.
- A sincronização geral pelo botão ⟳ continua igual.
