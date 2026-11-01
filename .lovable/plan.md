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
