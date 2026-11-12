# Parte 1 (urgente): carta do IBE-01 aparecendo em outros circuitos

## O que aconteceu
- **Não houve vazamento entre contas.** Cada superintendente só vê os próprios modelos (conferido no banco: a regra de acesso é "só o dono").
- O problema é o **modelo inicial do app**: ele veio preenchido com os seus dados (Wanderson Rodrigues, IBE-01, endereço e telefone de Angola). Toda conta nova recebe uma cópia dele como "padrão".
- Hoje 13 contas ainda têm essa cópia intacta. O irmão do MG-037 criou o modelo dele, mas o padrão (⭐, usado nos eventos) continua sendo a cópia antiga — editada só em parte (nome trocado, "IBE-01" ainda lá).

## Correção
1. **Modelo inicial neutro**: nome, circuito, endereço, telefone e assinatura vêm do **perfil da própria conta** (nome e circuito); o que não existir fica em branco com dica "Preencha seu endereço". Textos genéricos continuam.
2. **Conserto automático das contas atuais** (no aparelho, sem mexer no banco à mão): se o modelo padrão de uma conta ainda tiver dados do IBE-01 e a conta não for a sua, o app troca só esses campos (nome, circuito, endereço, telefone, assinatura) pelos do perfil dela e sincroniza. Textos que o irmão editou ficam como estão.
3. Se a conta tiver um modelo próprio criado por ela e o padrão for a cópia antiga, o **modelo dela vira o padrão ⭐**.
4. Aviso único no editor: "Revise o timbre do seu modelo de carta".

```text
┌─────────────────────────────┐
│ ‹ Modelos                    │
│ ┌─────────────────────────┐ │
│ │ ⓘ Revise o timbre do seu │ │
│ │   modelo de carta.  [OK] │ │
│ └─────────────────────────┘ │
│ ⭐ Assembleia de Circuito    │
│    Padrão · MG-037           │
│    Assembleia de circuito  › │
└─────────────────────────────┘
```

### Detalhes técnicos
- `defaultTemplate(profile?)` sem dados pessoais; perfil lido de `profiles` (nome/circuito) já em cache local.
- `repairInheritedTemplate(list, profile, isOwner)` puro em letter-template.ts (detecta "IBE-01"/"Wanderson Rodrigues"/telefone +244 nos campos de timbre); aplicado em `fetchLetterTemplates`, grava via fluxo de sync existente (upsert do próprio dono, RLS intacta). Sua conta identificada pelo circuito IBE-01 no perfil.
- Testes: modelo herdado é corrigido; modelo do Wanderson não muda; modelo próprio vira padrão; textos editados preservados.

---

# Parte 2: Cartas convite: ajustes manuais de formatação + contador de páginas

## O que muda para você
No editor do **modelo de carta** (Circuito > Grandes Eventos > Modelos) entra:
1. **Contador de páginas ao vivo** no topo: "1 página ✓" (verde) ou "2 páginas ⚠" (laranja). Atualiza sozinho ~1 s depois de você parar de digitar.
2. **Painel "Layout da carta"** (novo bloco recolhível): modo **Automático** (como hoje) ou **Manual**, com tamanho da letra, margens e espaçamento entre blocos.
3. **Barra de formatação** em cada caixa de texto longo (abertura, destaque, lembretes, ensaio, texto final): **Negrito**, *Itálico*, **Marcador (•)**, **Destaque (marca-texto)** e um ajuste de **espaço acima/abaixo** daquela caixa.

O ajuste automático continua sendo o padrão. Modelos antigos geram a carta exatamente igual a hoje.

## Mockup — editor do modelo
```text
┌─────────────────────────────┐
│ ‹ Modelos     👁 Prévia  Salvar│
│ ┌─────────────────────────┐ │
│ │ 📄 1 página ✓            │ │  ← verde / laranja se 2+
│ │ Nível automático: 3 de 6 │ │
│ └─────────────────────────┘ │
│ Nome do modelo              │
│ [Assembleia de circuito   ] │
│ ▸ Timbre                    │
│ ▾ Início da carta           │
│   Texto de abertura         │
│   ┌─────────────────────┐   │
│   │ B  I  •  🖍  ↕       │   │  ← barra de ferramentas
│   ├─────────────────────┤   │
│   │ Por ser um exemplo  │   │
│   │ como **ancião** ... │   │
│   └─────────────────────┘   │
│ ▸ Informações e lembretes   │
│ ▸ Encerramento              │
│ ▾ Layout da carta           │
│   ( Automático | Manual )   │  ← segmentado estilo iOS
│   Letra       − 11,5 pt +   │
│   Margens lat.− 2,4 cm  +   │
│   Margem sup. − 2,1 cm  +   │
│   Margem inf. − 2,0 cm  +   │
│   Espaçamento ───●──── 80%  │
│   [ Voltar ao automático ]  │
│ ▸ Papel timbrado            │
│ ▸ Cores da carta            │
│ [      Salvar modelo      ] │
└─────────────────────────────┘
```

## Mockup — botão ↕ (espaço da caixa)
```text
┌─────────────────────────────┐
│  Espaço do "Texto de abertura"│
│  Acima   − 0 +   (pontos)    │
│  Abaixo  − 12 +              │
│  [          Pronto        ]  │
└─────────────────────────────┘
```

## Regras
- **Manual**: usa exatamente seus valores (letra 9–14 pt, margens 1–3 cm). Se passar de 1 página, o contador avisa e a exportação continua mostrando o aviso atual.
- **Automático**: os 6 níveis de hoje; o contador mostra qual nível foi usado.
- Negrito/itálico/marcador/destaque valem para o PDF; no Word (lista de conferência) nada muda.
- O quadro da designação (evento, orador, link, PIN) continua automático, sem barra de ferramentas.
- Cada modelo guarda seu próprio layout e sincroniza entre aparelhos como já acontece.

## Detalhes técnicos
- `LetterTemplate` ganha campos opcionais: `layout?: { mode: "auto"|"manual"; size; side; top; bottom; gap }` e `spacing?: Partial<Record<campo, {above; below}>>`. Ficam dentro do JSON `data` já existente em `letter_templates` — **sem mudança no banco**. Ausente = comportamento atual.
- Marcação leve no próprio texto (`**negrito**`, `*itálico*`, `==destaque==`, linha começando com `• `), para não mudar o formato de armazenamento. Novo `letter-markup.ts` converte em trechos `{text, bold, italic, mark}`.
- `letter-render.ts`: `wrapP`/`text()` passam a desenhar trechos com fonte variável (serif/serifBold/serifItalic) mantendo justificação e recuo; marcador vira recuo pendurado; destaque = retângulo claro (`pal.ruleTint`) atrás do trecho. `letterPdfFit` respeita `layout.mode` e devolve `{bytes, pages, level}`.
- Editor: `FormatToolbar` envolve a seleção do `Textarea` com os marcadores; contador usa `letterPdfFit` com debounce de 800 ms sobre o modelo de exemplo já usado na Prévia.
- Testes: `letter-markup.test.ts` (parse de negrito/itálico/destaque/marcador, texto sem marcação inalterado) e teste de `letterPdfFit` (modo manual não muda o nível; modelo antigo = nível automático igual ao atual).
- Regra nova em `AGENTS.md`: formatação da carta é marcação leve dentro do texto + layout opcional no JSON do modelo, porque modelos antigos e o sync não podem mudar.
