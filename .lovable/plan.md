# Cores configuráveis no modelo de carta (Grandes Eventos)

## Resposta curta
Sim, dá pra fazer, e o risco é baixo. Hoje a carta em PDF usa quatro cores fixas: verde-petróleo (título, borda da caixa de designação, "Clique aqui!"), dourado (filete do cabeçalho e barra lateral dos lembretes), além do fundo claro da caixa e o fundo da faixa de informações. A sugestão é escolher as cores **por modelo de carta**, com paletas prontas e elegantes, mais a opção de ajustar cada parte.

## O que o usuário vê
No editor do modelo (pílula "Modelos de carta"), uma nova seção recolhível "Cores da carta":

```text
┌───────────────────────────────┐
│ ‹  Modelo padrão         Salvar│
├───────────────────────────────┤
│ ▸ Cabeçalho                   │
│ ▸ Texto da carta              │
│ ▾ Cores da carta              │
│                               │
│  Paleta                       │
│  (●)Clássica  ( )Azul-marinho │
│  ( )Vinho     ( )Grafite      │
│  ( )Sem cor (só preto e cinza)│
│                               │
│  Ajustar por parte            │
│  Título e cabeçalho   [■] ›   │
│  Caixa de designação  [■] ›   │
│  Informações/lembretes[■] ›   │
│  Filete decorativo    [■] ›   │
│                               │
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

Ao tocar em uma parte abre uma folha inferior (padrão iOS/One UI) com cerca de 10 bolinhas de cor já testadas para impressão. Não haverá seletor livre de cor, para a carta continuar legível e com aparência profissional.

```text
┌───────────────────────────────┐
│  Caixa de designação          │
│  ● ● ● ● ●                    │
│  ● ● ● ● ●                    │
│  Fundo da caixa: [Claro ▾]    │
│  (Claro / Sem fundo)          │
│            [ Pronto ]         │
└───────────────────────────────┘
```

## Comportamento
- Cada modelo guarda as próprias cores. Assim, um evento pode usar um modelo azul e outro, um modelo vinho.
- Modelos antigos, sem cores salvas, continuam idênticos ao de hoje (paleta "Clássica").
- As cores vão junto com o modelo na sincronização que já existe (outro aparelho recebe igual) e no backup.
- A cor do texto continua grafite (nunca colorida), para garantir a leitura.
- O texto "Clique aqui!" acompanha a cor da caixa de designação.
- A exportação Word (lista de conferência) não muda, porque ela não tem decoração.

## Detalhes técnicos
- `letter-template.ts`: campo opcional `colors?: { title, box, boxFill: "tint"|"none", info, rule }` com ids de uma paleta fixa (`LETTER_PALETTE`), mais as predefinições `LETTER_PRESETS`. A função `sanitize` descarta ids desconhecidos, e um campo ausente usa a paleta Clássica.
- `letter-render.ts`: troca as constantes `ACCENT/GOLD/TINT_*` por `resolveColors(tpl.colors)`, e os tons claros de fundo são derivados da cor escolhida. A lógica de paginação (caber em 1 página) não muda.
- `LetterTemplates.tsx`: nova `CollapsibleSection` "Cores da carta", com prévia em miniatura feita em HTML com as mesmas cores (sem gerar PDF a cada toque).
- Sincronização: as cores ficam dentro do `data jsonb` que já existe em `letter_templates`, então o banco não muda.
- Testes: um modelo sem `colors` gera as cores atuais, um id inválido volta ao padrão e cada predefinição resolve as 4 partes.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Não precisa de plugin novo nem de nova versão do app.
