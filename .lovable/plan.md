# Pauta dos anciãos: modos "Preparar a pauta" e "Somente leitura"

## Ideia geral
A pauta do superintendente passa a ter 3 modos, sempre com uma barra de pílulas no topo (padrão iOS/One UI):

```text
 ┌──────────────────────────────────────┐
 │ ( Leitura )( Preparar )( Montar )    │
 └──────────────────────────────────────┘
```

- **Montar** = estrutura (tópicos, cartões, ordem, permissões, cabeçalho). Igual ao de hoje.
- **Preparar a pauta** = o antigo "Modo normal", agora em tela inteira estilo esboço, para escrever, colar links e anexar.
- **Leitura** = pauta pronta, limpa e organizada. É onde a pauta abre por padrão depois de preparada.

Ao tocar em **Salvar** no "Preparar", a pauta é salva e vai direto para a **Leitura**.
Os anciãos continuam como hoje (sem as pílulas Montar/Preparar).

## 1. Preparar a pauta (tela inteira, estilo esboço)
Esconde o topo do app (como no editor de esboços), tópicos em sequência, campos grandes.

```text
 ┌──────────────────────────────────────┐
 │ ✕  Preparar a pauta        [ Salvar ]│
 ├──────────────────────────────────────┤
 │ 1. Visita aos grupos          15 min │
 │ ─────────────────────────────────────│
 │ 📖 Fontes de matéria                 │
 │  [ w23.05 p.12        ] [🔗 link ]   │
 │  + Adicionar publicação              │
 │ 📝 Informações do SC                 │
 │  [ texto livre...                  ] │
 │ 📎 Anexos   [+ Foto] [+ PDF] [+ Link]│
 │                                      │
 │ 2. Recomendações              10 min │
 │ ─────────────────────────────────────│
 │  ...                                 │
 ├──────────────────────────────────────┤
 │ ◀ Tópico anterior   Próximo tópico ▶ │
 └──────────────────────────────────────┘
```

## 2. Somente leitura (SC)
Tudo visível e organizado; nada de caixas de digitação abertas.

```text
 ┌──────────────────────────────────────┐
 │ ( Leitura )( Preparar )( Montar )    │
 │      PAUTA – REUNIÃO COM ANCIÃOS     │
 │      Isa 50:4 · Central · Ter 19:00  │
 │ [ ⛶ Tela cheia ]   [ ⬇ PDF ]         │
 ├──────────────────────────────────────┤
 │ 1. Visita aos grupos          15 min │
 │ 📖 Fontes: w23.05 p.12 | Vídeo X     │  ← títulos clicáveis
 │ 📎 [Foto 1] [Relatório.pdf]          │  ← abre no visualizador
 │ 👥 Respostas dos anciãos   ‹ 2/3 ›   │
 │  ┌────────────────────────────────┐  │
 │  │ João · Sim / Em parte ...      │  │  ← carrossel deslizável
 │  └────────────────────────────────┘  │
 │ 🔒 Informações do SC (só você)  ✏️   │
 │  Texto salvo aparece aqui.           │
 ├──────────────────────────────────────┤
 │ 2. Recomendações                     │
 │  • Irmão Pedro – Designar ✅         │
 │  🔒 Comentário do SC            ✏️   │
 │   "Bom exemplo no campo."            │
 └──────────────────────────────────────┘
```

**Edição individual sem sair da leitura:** cada campo de texto do SC (Informações do SC, Comentário do SC, Nota particular, Resposta do SC) tem um lápis ✏️. Ao tocar, abre uma folha de baixo só com aquele campo:

```text
 ├──────────────────────────────────────┤
 │ Comentário do SC – Irmão Pedro       │
 │ [ Bom exemplo no campo.            ] │
 │ [ Cancelar ]            [ Salvar ]   │
 └──────────────────────────────────────┘
```
Salva só aquele campo e a tela continua em Leitura. Campos só do SC aparecem com cadeado 🔒 e fundo suave para não confundir com o que os anciãos veem.

## Minhas sugestões extras (incluídas no plano)
1. **Abrir em Leitura** quando a pauta já foi preparada; abrir em Preparar quando ainda está vazia.
2. **Indicador de progresso** no topo da Leitura: "3 de 5 anciãos responderam · 2 tópicos sem conteúdo".
3. **Selo "Só você vê"** padronizado (cadeado) em todos os campos privados.
4. **Aviso ao sair do Preparar** sem salvar ("Descartar alterações?").
5. Tópicos recolhíveis também na Leitura (lembrado no aparelho).

## O que NÃO muda
- Dados salvos, sincronização, PDFs, permissões, anexos e respostas dos anciãos ficam iguais; é só apresentação. A versão instalada pela Play Store continua funcionando.
- Tela cheia (cronômetro) e Montar seguem como hoje.

## Detalhes técnicos
- `ElderAgendaView.tsx`: trocar `building: boolean` por `mode: "read" | "prepare" | "build"` (pílulas segmentadas); modo inicial calculado pelo conteúdo; preferência só em memória.
- Novo `AgendaPrepareScreen.tsx` em tela inteira usando `focus-chrome` + `useStableViewportHeight`, reaproveitando os editores de cartão atuais; Salvar chama o save existente e muda para `read`.
- Novo `AgendaReadView.tsx` reutilizando os renderizadores de links (" | "), `AgendaAttachments` (visualizador), carrossel de `ElderInfoResponses`.
- Novo `AgendaFieldSheet.tsx` (Sheet de baixo) que edita um campo e chama `patch` + save pontual do payload.
- Guard de alterações não salvas; textos pt/en/es; Ajuda (`help-content`) atualizada com os novos rótulos; testes de que salvar um campo isolado preserva respostas dos anciãos.
