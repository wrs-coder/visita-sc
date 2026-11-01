# Cores da carta, termos em português e Agenda mais detalhada

## 1. Cores configuráveis no modelo de carta (Grandes Eventos)
Cada modelo de carta pode ter as próprias cores, escolhidas entre paletas prontas e elegantes, com ajuste por parte. Hoje a carta usa cores fixas: verde-petróleo no título, na caixa de designação e no "Clique aqui!", e dourado no filete e na barra dos lembretes.

A seção nova **"Cores da carta" pode ser recolhida e expandida**, como as outras partes do editor. Ela começa recolhida e mostra um resumo com a paleta escolhida. O aparelho lembra se você deixou aberta ou fechada.

```text
┌───────────────────────────────┐
│ ‹  Modelo padrão        Salvar│
├───────────────────────────────┤
│ ▸ Cabeçalho                   │
│ ▸ Texto da carta              │
│ ▸ Cores da carta  · Clássica  │  ← recolhida
└───────────────────────────────┘

┌───────────────────────────────┐
│ ▾ Cores da carta              │  ← expandida
│  Paleta                       │
│  (●)Clássica  ( )Azul-marinho │
│  ( )Vinho     ( )Grafite      │
│  ( )Sem cor (preto e cinza)   │
│  Ajustar por parte            │
│  Título e cabeçalho   [■] ›   │
│  Caixa de designação  [■] ›   │
│  Informações/lembretes[■] ›   │
│  Filete decorativo    [■] ›   │
│  ┌ Prévia ───────────────┐    │
│  │ ▬▬ NOME DO SC ▬▬      │    │
│  │ ───── filete ─────    │    │
│  │ ┌ DESIGNAÇÃO ─────┐   │    │
│  │ │ Discurso nº 13  │   │    │
│  │ └─────────────────┘   │    │
│  │ ▌ Informações...      │    │
│  └───────────────────────┘    │
│  [ Restaurar cores padrão ]   │
└───────────────────────────────┘
```

Ao tocar em uma parte, abre uma folha inferior com cerca de 10 cores testadas para impressão, mais a opção de fundo da caixa (Claro ou Sem fundo). Não haverá seletor livre de cor, para a carta continuar legível.

- O texto continua em grafite.
- Modelos antigos ficam iguais ao de hoje, na paleta Clássica.
- As cores sincronizam junto com o modelo e entram no backup.
- A exportação Word não muda.

## 2. Termos em inglês ou "em código" no Painel
Alguns campos mostram o valor interno em vez do nome em português. Exemplos: "Categoria: sick" e "grupo_de_campo". Vou trocar por nomes legíveis em todos os pontos do Painel, tanto nos cartões quanto nos detalhes:

- **Encorajamento, categoria:** sick → Doente, inactive → Inativo, special_privileges → Privilégios especiais.
- **Recomendação, propósito:** ministerial_servant → Servo ministerial, elder → Ancião, redesignation → Redesignação, removal → Remoção, cca_change → Mudança de CCA.
- **Modalidades de campo** e outros valores com "_": também passam a ter nome em português. Se algum valor for desconhecido, ele aparece com o "_" trocado por espaço e a primeira letra maiúscula, nunca em formato de código.

Também vou procurar as mesmas falhas nas telas da esposa e dos anciãos, que mostram esses dados, e corrigir onde houver.

```text
Antes                         Depois
┌──────────────────────────┐  ┌──────────────────────────┐
│ Encorajamento            │  │ Encorajamento            │
│ Irmã Lúcia               │  │ Irmã Lúcia               │
│ Categoria: sick          │  │ Categoria: Doente        │
│ grupo_de_campo           │  │ Grupo de campo: Grupo 2  │
└──────────────────────────┘  └──────────────────────────┘
```

## 3. Agenda com mais detalhes
Hoje a Agenda mostra o título e o local, e os detalhes só aparecem ao abrir o evento. A proposta é mostrar até 2 linhas curtas com o mais importante, direto na lista. Os detalhes completos continuam ao tocar no evento.

- **Saída de campo:** território, quem dirige e quem faz a oração final.
- **Reunião do meio de semana:** presidente e orações.
- **Reunião do fim de semana:** os temas dos dois discursos (o discurso público e o do superintendente) e o presidente.
- **Refeição:** família e endereço.
- **Transporte:** motorista e horário de saída.

```text
┌───────────────────────────────┐
│ Agenda   [Seg][Ter][Qua] 📅   │
├───────────────────────────────┤
│ 08:30  Saída de campo         │
│        Território 12 · Centro │
│        Dirige: Ir. Souza ·    │
│        Oração: Ir. Lima       │
│ ───────────────────────────── │
│ 18:00  Reunião fim de semana  │
│        1) "Confie em Jeová…"  │
│        2) "Mantenha-se…" (SC) │
│        Presidente: Ir. Alves  │
└───────────────────────────────┘
```

Campos vazios não aparecem. Se faltar espaço, a linha termina com "…".

## Detalhes técnicos
- **Item 1:** campo opcional `colors` em `LetterTemplate`, com `LETTER_PALETTE` e `LETTER_PRESETS` em `letter-template.ts` (o sanitize descarta ids inválidos). `letter-render.ts` passa a usar `resolveColors()` no lugar das constantes `ACCENT/GOLD/TINT_*`, sem mudar a paginação. A seção do editor usa `CollapsibleSection` (estado em localStorage). As cores ficam no `data jsonb` que já existe, então o banco não muda.
- **Item 2:** novo `src/lib/enum-labels.ts` com `encouragementCategoryLabel`, `recommendationPurposeLabel`, `modalityLabel` e `humanizeCode`, que usam chaves i18n em pt.json, en.json e es.json. Aplicar em `_app.dashboard.tsx` (linhas de cartão e detalhes, por volta das linhas 1637, 2154 e 2409) e nas telas de resumo que mostram esses dados. Antes de corrigir, confirmar com uma busca de onde vem o "grupo_de_campo".
- **Item 3:** um campo opcional `lines?: string[]` no item da agenda, preenchido no mesmo `map` que já monta `details`. A renderização usa `line-clamp-1` por linha, no máximo 2 linhas. Os lembretes e o resumo do dia não mudam.
- **Testes:** cores padrão quando o modelo não tem `colors`; rótulos em português para cada valor interno; `humanizeCode("grupo_de_campo") === "Grupo de campo"`.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Não precisa de plugin nem de nova versão do app.

## 4. Folga no fim da rolagem (botões sob a barra do Android)
É uma boa solução e a mais segura: não mexe na sobreposição das telas, só acrescenta espaço vazio no final do conteúdo. Hoje o fim de cada tela tem uma folga de cerca de 12px mais a altura da barra do Android, mas em alguns aparelhos (navegação por 3 botões) o sistema não informa essa altura corretamente. Por isso o último botão às vezes fica escondido.

Proposta: a folga no fim de todas as telas passa a ser a **altura da barra do Android + cerca de 1,5 linha (≈ 72px)**. Também haverá um mínimo garantido de 56px, mesmo quando o aparelho não informa a barra. Nos computadores continua igual.

```text
┌───────────────────────────────┐
│  ...último campo...           │
│  [        Salvar         ]    │
│                               │  ← folga extra (≈ 1,5 linha)
│                               │
├───────────────────────────────┤
│    ◁      ○      ▢            │  ← barra do Android
└───────────────────────────────┘
```

- Vale para todas as telas internas, numa única regra. Nenhuma tela precisa ser alterada uma a uma.
- Também vale para as janelas que rolam por dentro, como Nova/Editar visita e as folhas inferiores. Nesses casos, os botões fixos no rodapé ganham a mesma folga.
- Telas de leitura e de escrita em modo foco também recebem a folga, para o último parágrafo nunca ficar escondido.

### Detalhes técnicos (item 4)
- Em `styles.css`, a classe `.safe-bottom-content` passa a usar `calc(4.5rem + max(env(safe-area-inset-bottom), var(--safe-area-inset-bottom), 3.5rem - 4.5rem))`, ou seja, inset + 72px com piso de 56px. O breakpoint `md` continua em 2rem.
- Essa classe já é aplicada no contêiner principal de `_app.tsx`, então uma única mudança cobre todas as rotas.
- Rodapés de Dialog/Drawer que usam `pb-[env(safe-area-inset-bottom)]` ou `.pb-safe` passam a ter um piso de 1rem extra.
- O teclado e a altura estável do editor não mudam.

## 5. Exportação Word: convites bem separados
Cada convite da lista de conferência ganha uma separação clara. Entre um convite e outro haverá uma linha horizontal, um espaço maior e o número e horário do convite em negrito no topo de cada bloco. Os textos continuam fáceis de copiar.

```text
 Convite 1 · 09:40
 Discurso nº 13 — João Silva
 Congregação Centro
 Link: visitasc.com.br/c/ab12cd34
 ─────────────────────────────────
 Convite 2 · 10:10
 Oração — Pedro Lima
 Congregação Norte
 Link: visitasc.com.br/c/ef56gh78
 ─────────────────────────────────
```

Técnico: em `assignmentsListHtml`, cada bloco recebe um título numerado e um `<hr>` com borda sólida entre os blocos, que o conversor de Word já transforma em linha. O formato de importação não muda.

## Complemento do item 4: menu lateral
A mesma folga vale para o menu lateral (aberto pelo ☰). Assim, o último item, "Apoie o Desenvolvedor ☕", fica sempre acima da barra do Android. Técnico: a área rolável do menu (`SheetContent` em `_app.tsx`) recebe a mesma classe `.safe-bottom-content`. A regra continua única.
