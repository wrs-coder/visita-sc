# Congregações — reconhecer nomes parecidos na importação

Sim, é possível. Hoje a importação de congregações só reconhece nomes **idênticos** (marca "Já existe" e pula). A importação de visitas já tem um comparador de semelhança (ignora acentos, "Cong.", zeros à esquerda, erros de digitação, e nunca confunde "Funda 1" com "Funda 2"). Vamos reaproveitar esse mesmo comparador.

## Como vai funcionar

Na lista de revisão, cada linha do arquivo cai em um de três grupos:

- **Nova** — nenhuma parecida no app → cria normalmente (como hoje).
- **Igual** — nome idêntico → "Já existe", não faz nada (como hoje).
- **Parecida** (novo) — nome muito semelhante a uma já cadastrada → aparece um cartão com a escolha:
  - **Substituir nome** — troca só o nome da congregação existente pelo nome do arquivo. O **código de acesso não muda**, anciãos continuam entrando normalmente. Visitas, anotações e histórico ficam intactos.
  - **Manter como está** (padrão) — não mexe em nada.
  - **Criar como nova** — se na verdade for outra congregação.

O toggle "Manter número da congregação" também vale para o nome substituído.

## Mockup

```text
┌──────────────────────────────┐
│ Revisar importação        ✕  │
│ 16 encontradas · 2 parecidas │
│ [✓] Manter nº da congregação │
├──────────────────────────────┤
│ PARECIDAS COM AS SUAS        │
│ ┌──────────────────────────┐ │
│ │ No arquivo:              │ │
│ │  Jardim Alvorada (18911) │ │
│ │ No app:                  │ │
│ │  Jd. Alvorada · 48213    │ │
│ │ ( ) Substituir nome      │ │
│ │ (•) Manter como está     │ │
│ │ ( ) Criar como nova      │ │
│ │ Código 48213 não muda.   │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ NOVAS                        │
│ [✓] Vila Nova      [ 37190 ] │
│ [✓] Centro Sul     [ 52844 ] │
├──────────────────────────────┤
│ JÁ EXISTEM (3)          ⌄    │
├──────────────────────────────┤
│  Criar 2 · Renomear 1        │
│ [      Confirmar        ]    │
└──────────────────────────────┘
```

Estilo iOS/One UI: grupos com títulos em cinza, cartões arredondados, botão principal fixo embaixo dizendo exatamente o que será feito.

## Segurança

- Só renomeia o que o superintendente escolher (padrão = manter).
- Código de acesso, visitas e dados nunca são alterados.
- Uma congregação do app só pode ser "alvo" de uma linha do arquivo (evita renomear duas vezes).
- Sem mudança no banco: usa a função de editar congregação que já existe.

## Ajuda

Adicionar no painel de Ajuda (Circuito e visitas) um parágrafo explicando "Parecidas com as suas" e que o código não muda.

## Detalhes técnicos

- Mover `normalizeName`/`similarity`/`STRONG` do `itinerary-import.ts` para um módulo compartilhado (`name-match.ts`) e reexportar no original, sem mudar comportamento.
- `buildRows` em `CongregationImportDialog.tsx`: além de `exists`, calcular `match: {id, name, code, score}` quando score ≥ 85 (STRONG) e não idêntico; campo `action: "keep" | "rename" | "create"`.
- Confirmar: criações via `onCreate` atual; renomeações via `updateCongregation` (só `name`), com progresso e erro por item.
- Testes novos: "Jd. Alvorada" × "Jardim Alvorada" vira parecida; "Funda 1" × "Funda 2" não; renomear mantém código; um alvo não aceita duas linhas.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Sem subir versão.
