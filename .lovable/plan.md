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

---

# Parte 2: iPad (telas confusas, "campo azul" e PDF que não abre)

## Causa provável do PDF (a confirmar no primeiro passo)
O leitor de PDF usado (versão 6 recente) exige recursos novos do Safari; em iPads com iOS um pouco mais antigo ele falha e mostra "Não foi possível mostrar este PDF". O mesmo leitor também é usado na importação de oradores.

**Correção:** usar a versão "compatível" do leitor (feita para navegadores mais antigos) e, se mesmo assim falhar, mostrar o PDF pelo leitor nativo do iPad dentro da própria tela (sem salvar no aparelho), com o botão "Abrir de outra forma".

## "Campo azul"
Provavelmente é o destaque azul que o Safari pinta ao tocar em botões/cartões e o contorno azul de foco. **Correção:** remover o destaque de toque e trocar o contorno por um anel suave na cor do app, só quando usar teclado.

## Telas confusas no iPad
Hoje as telas são esticadas da largura do celular. Proposta (padrão iPadOS / One UI tablet):

```text
 ┌──────────────────────────────────────────────────────────┐
 │  Pauta – Reunião com Anciãos      ( Leitura )(Preparar)  │
 ├───────────────────┬──────────────────────────────────────┤
 │ TÓPICOS           │ 1. Visita aos grupos          15 min │
 │ ▸ 1. Visita       │ 📖 Fontes: w23.05 | Vídeo X          │
 │   2. Recomend.    │ 👥 Respostas   ‹ 1/3 ›               │
 │   3. Considerações│ 🔒 Informações do SC            ✏️   │
 │   4. Oração final │                                      │
 └───────────────────┴──────────────────────────────────────┘
```
- Conteúdo com largura máxima confortável e centralizado nas demais telas (sem linhas enormes).
- Na pauta e em telas de leitura: lista de tópicos à esquerda, conteúdo à direita.
- Painéis/folhas de baixo viram janelas centralizadas no iPad.
- Respeitar a área segura do iPad (barra de baixo e orientação horizontal).

Para eu acertar exatamente o que te incomodou, seria ótimo uma captura de tela do iPad mostrando o campo azul.

## Detalhes técnicos
- `AttachmentViewer.tsx` e `speaker-import.ts`: importar `pdfjs-dist/legacy/build/pdf.mjs` + worker legacy; fallback em `<iframe>`/`<object>` com blob URL em memória (revogado ao fechar).
- `styles.css`: `-webkit-tap-highlight-color: transparent`, `:focus-visible` com token `--ring`; nada de hex.
- Layout: container `max-w-3xl mx-auto` em `md:`, grade de duas colunas em `lg:` na pauta; Sheet → Dialog em `md:`.
- Verificar com Playwright em 820x1180 e 1180x820 (perfil WebKit).
