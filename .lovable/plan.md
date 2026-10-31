# Plano: recolher/expandir na Leitura da Bíblia + carta PDF elegante

## 1. Recolher e expandir nas abas Pessoal, Família e Reunião

Hoje só "Minha programação" e "Livros da Bíblia" recolhem. Passam a recolher também:

| Caixa | Aba | Recolhida mostra |
|---|---|---|
| Leitura da reunião (semana) | Reunião | "Is 58-59 · 1/2 lidos" |
| ★ Para comentar | Reunião | "3 pontos" |
| Dias da semana | todas | "Hoje (Sáb): Salmos 23" |
| Meta de leitura (4 opções) | todas | "Meta: 1 ano" |
| Anotações / Pontos altos / JW Library | todas | aba ativa + contagem |

A barra de progresso fixa ("42% · Continuar") **continua sempre visível**: é o acesso rápido e não recolhe.

Comportamento (padrão iOS/One UI): cabeçalho inteiro tocável, seta que gira, animação suave. Cada aba guarda o seu estado aberto/fechado neste aparelho. Ao recolher, nada é apagado: textos sendo digitados continuam lá.

```text
┌─────────────────────────────┐
│ [Pessoal] [Família][Reunião]│
├─────────────────────────────┤
│ ▾ Leitura da reunião        │
│   Semana 27/10 · Is 58-59   │
│   [Is 58 ✓] [Is 59]         │
│   Ajustar esta semana       │
├─────────────────────────────┤
│ ▸ ★ Para comentar    3      │
├─────────────────────────────┤
│ ▸ Dias da semana            │
│   Hoje (Sáb): Salmos 23     │
├─────────────────────────────┤
│ 42% ━━━━━─────  [▶ Continuar]│  ← sempre visível
├─────────────────────────────┤
│ ▸ Livros da Bíblia (66)     │
├─────────────────────────────┤
│ ▾ Anotações · Pontos altos  │
│   ...                       │
└─────────────────────────────┘
```

## 2. Carta em PDF elegante

O conteúdo e a ordem do seu modelo Nº 13 são mantidos. Mudanças só de acabamento:

- **Tipografia:** títulos (nome no timbre, "Ref.", títulos de seção) em **Lora** (serifa clássica, muito boa em português); corpo em **Lato**. As fontes vão junto com o app, então funciona sem internet. A assinatura fica em Lora Itálica.
- **Margens amplas:** de 50 para ~72 pt (2,5 cm), entrelinha 1,5, espaço suave entre parágrafos.
- **Cores:** texto em grafite (não preto puro); detalhes (linha do timbre, borda da caixa, botão) em um azul petróleo discreto.
- **Detalhes clássicos:** local e data alinhados à direita; saudação formal; corpo justificado (última linha à esquerda); linha fina dourada/cinza abaixo do timbre.
- **Caixa da designação:** cantos arredondados, fundo levemente tingido, rótulos em versalete ("ORADOR", "HORÁRIO") e valores em negrito.
- **Faixas de lembretes:** em vez de faixas coloridas cheias, uma barra lateral fina colorida + fundo bem claro (mais sóbrio).
- **"Clique aqui"** continua um botão com link ativo ao toque.

```text
┌──────────────────────────────┐
│      Wanderson Rodrigues      │ Lora
│            IBE-01             │
│     endereço · telefone       │
│  ─────────────────────────    │
│            Goiânia, 31/10/2026│ → direita
│ Prezado irmão Fulano          │
│ Cong. Central                 │
│ Ref.: Designação no evento    │
│                               │
│ Texto de abertura justificado │
│ com entrelinha confortável... │
│ ╭───────────────────────────╮ │
│ │ EVENTO   Assembleia...    │ │
│ │ DATA     08/11 · 09:30    │ │
│ │ PARTE    Nº 07 · 15 min   │ │
│ │ TEMA     ...              │ │
│ │      [ Clique aqui! ]     │ │
│ ╰───────────────────────────╯ │
│ ┃ Lembretes importantes       │
│ ┃ • ...                       │
│ Fraternalmente,               │
│ Wanderson Rodrigues (itálico) │
└──────────────────────────────┘
```

### Pontos onde preciso mudar algo do seu modelo (para sua decisão)
1. **Fundo off-white:** fica lindo na tela, mas ao imprimir sai um tom bege na folha e gasta tinta. Proposta: papel **branco**, e o tom quente aparece só na caixa da designação.
2. **Faixas coloridas cheias** dos lembretes viram barra lateral fina (acima).
3. **Texto justificado** no corpo; os lembretes em lista ficam alinhados à esquerda (justificar listas cria espaços feios).

O Word continua como está (o Word usa as fontes do próprio computador); só o PDF muda.

## Ordem de execução
1. Recolher/expandir (só tela, sem mudar dados).
2. Carta PDF: fontes embutidas + novo layout, mantendo nome dos arquivos, link e PIN.
3. Testes + prévia de um PDF de exemplo para sua conferência.

## Detalhes técnicos
- Novo componente `CollapsibleSection` em guest-workspace (cabeçalho com resumo, `aria-expanded`, conteúdo oculto com `hidden`, nunca desmontado); estado em localStorage `bible.collapse.<track>.<box>`.
- MeetingWeekCard, CommentCard e WeekdayCard recebem um `summary` e passam a usar o componente; meta e aba inferior envoltas em BibleReadingTab. Nenhum formato de dado muda.
- letter-render.ts: registrar `@pdf-lib/fontkit` (já no package.json) e embutir TTF de Lora (Regular/Bold/Italic) e Lato (Regular/Bold) em `public/fonts/letter/` (OFL), carregadas por fetch e cacheadas; fallback para fontes padrão se falhar. Com fontes TTF, o filtro WinAnsi deixa de cortar caracteres.
- Justificação: distribuir espaço extra entre palavras por linha (exceto a última de cada parágrafo).
- Testes existentes do PDF (link ativo, nome do arquivo) continuam; adicionar teste de que as fontes embutidas e a data à direita estão presentes.
- Sem mudança de banco nem de versão.
