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

---

# Parte 3: Botão "Atualizar pauta" e anexo excluído que continua aparecendo

## O que vi até agora (causa ainda a confirmar no 1º passo)
- Depois de salvar, a tela não recarrega a pauta do servidor: continua mostrando a versão que estava aberta, e a cópia guardada no aparelho (para uso offline) pode reaparecer ao reabrir a tela.
- Ao gravar a resposta de um ancião, o app envia a pauta inteira que está na tela; se essa tela estiver desatualizada, pode "ressuscitar" algo que já foi apagado em outro aparelho.
- O arquivo excluído pode continuar guardado no aparelho (cópia local do SC) e na pasta da nuvem.

**Primeiro passo:** reproduzir (apagar anexo → salvar → reabrir / abrir em outro aparelho) e confirmar qual dessas é a causa antes de corrigir.

## Correção proposta
```text
 ┌──────────────────────────────────────┐
 │ ( Leitura )( Preparar )( Montar ) ⟳  │  ← Atualizar pauta
 │ Atualizado às 22:05 · ✓ em dia       │
 └──────────────────────────────────────┘
```
- Botão **⟳ Atualizar pauta** (também "puxar para baixo"): busca a versão mais nova da nuvem, substitui a cópia do aparelho e mostra "Atualizado às HH:MM".
- Se houver alterações não salvas, pergunta: "Salvar antes / Descartar e atualizar".
- Depois de **Salvar**, a tela recarrega sozinha a versão do servidor (o que você vê = o que está salvo).
- Excluir anexo apaga também o arquivo da nuvem e a cópia do aparelho, após salvar.
- Respostas dos anciãos passam a gravar só a própria resposta, sem reenviar o resto da pauta.
- Aviso quando outra pessoa salvou depois que você abriu: "A pauta mudou em outro aparelho. Atualizar?"

## Detalhes técnicos
- `ElderAgendaView.tsx`: ação `refresh()` que chama o loader do servidor, regrava `agenda-cache`/IndexedDB e faz `setP`; chamada após `onSave`.
- Conflito otimista: enviar `updatedAt` conhecido em `saveAgenda`; se o do banco for mais novo, responder `stale` e oferecer atualizar.
- `commitResponses`: enviar payload base do servidor + só o cartão alterado (ou função dedicada de resposta).
- Remoção de anexo: `storage.remove` dos `cloudPath` que saíram do payload salvo (no servidor, comparando antes/depois) e limpeza do IndexedDB `visita-sc-agenda-att`.
- Testes: anexo removido não volta após merge; resposta de ancião não restaura anexo apagado.

---

# Parte 4: Telas adaptadas a cada aparelho (automático)

O app reconhece sozinho o tipo de tela e escolhe o layout. Não precisa configurar nada.

| Aparelho | Layout |
|---|---|
| Celular Android (app da Play Store) | Uma coluna, estilo One UI (como hoje, revisado) |
| iPhone (instalado pela tela de início) | Uma coluna, estilo iOS, respeitando entalhe/Dynamic Island e barra de baixo |
| Tablet Android | Duas colunas: lista à esquerda, conteúdo à direita |
| iPad 6ª geração ou mais novo | Duas colunas (horizontal) / coluna central larga (vertical) |

```text
 CELULAR                 TABLET / iPad (horizontal)
 ┌──────────────┐        ┌────────┬───────────────────────┐
 │ Início       │        │ Início │ Agenda da semana      │
 │ [card]       │        │ Esboços│ ┌──────┐ ┌──────┐     │
 │ [card]       │        │ Visita │ │ card │ │ card │     │
 │ [card]       │        │ Anciãos│ └──────┘ └──────┘     │
 └──────────────┘        │ Ajuda  │ ┌──────┐ ┌──────┐     │
                         └────────┴───────────────────────┘
```

## Como fica
- Tablet/iPad: menu lateral fixo no lugar das pílulas de topo; cartões do Início em grade (2 colunas, 3 em telas grandes) em vez de páginas deslizantes.
- Pauta, esboços e notas: lista à esquerda + conteúdo à direita.
- Formulários e janelas: centralizados com largura confortável (sem campos esticados).
- Girar o aparelho troca o layout na hora, sem perder o que estava digitado.
- iPhone/iPad instalados: barras e cores do sistema corretas, sem a marcação azul ao tocar.
- iPad 6ª geração (iPadOS 17): tudo testado para funcionar nele, incluindo o leitor de PDF.

## Ordem sugerida de entrega (ondas)
1. Correções urgentes: PDF no iPad, marcação azul, botão Atualizar pauta e anexo que volta.
2. Pauta: modos Leitura / Preparar / Montar.
3. Base de layouts por aparelho + Início e menu lateral no tablet.
4. Demais telas (esboços, notas, visita, circuito) no layout de tablet.

## Detalhes técnicos
- Detecção por largura (CSS `md:` 768px / `lg:` 1024px) e `@capacitor/core` `getPlatform()`/`display-mode: standalone` só para ajustes de plataforma; sem hook de viewport no SSR (mantém regra do DashboardPager: pager no celular, grade via CSS em `lg:`).
- `AppShell`: sidebar em `lg:` usando os mesmos links do header; header atual preservado no celular.
- `env(safe-area-inset-*)` revisado para iPhone/iPad standalone; manifesto e metas Apple existentes mantidos (sem mexer no `sw.js`).
- Verificação com Playwright (WebKit) em 390x844, 412x915, 800x1280, 810x1080 e 1080x810.
