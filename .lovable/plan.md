# Importar e exportar congregações (Circuito › Congregações)

## O que muda para você
1. Novo botão **Importar** na tela Congregações. Aceita os três formatos enviados: lista do JW.org (.csv), Word (.docx) e Excel (.xlsx).
2. O app lê o arquivo e mostra uma **lista de revisão** antes de criar qualquer coisa. Você marca quem é congregação de verdade.
3. Cada congregação recebe um **código de 5 números** (fácil de digitar). Você pode trocar o código ali mesmo, antes de confirmar.
4. Novo botão **Exportar** que gera um Word leve com todas as congregações e os códigos.

## Esboço — topo da tela
```text
┌─────────────────────────────┐
│ ‹  Circuito                 │
│ [Itinerário][Congreg.][Cron]│
├─────────────────────────────┤
│ Congregações (16)           │
│ ┌──────────┐ ┌──────────┐   │
│ │⤓ Importar│ │⤒ Exportar│   │
│ └──────────┘ └──────────┘   │
│ + Nova congregação          │
│ ...lista atual...           │
└─────────────────────────────┘
```

## Esboço — revisão da importação (folha que sobe)
```text
┌─────────────────────────────┐
│ ━━━━                        │
│ Revisar importação          │
│ 16 encontradas · 15 marcadas│
│ [Marcar todas][Desmarcar]   │
├─────────────────────────────┤
│ ☑ Cabiri          (18911)   │
│   Código  [ 48213 ] ✎       │
│ ☑ Cidade do Sequele 02      │
│   Código  [ 70519 ] ✎       │
│ ☐ CONGREGAÇÕES:  ← título   │
│ ⚠ Funda 01 — já existe      │
│   (será ignorada)           │
│ ...                         │
├─────────────────────────────┤
│ [Cancelar] [Criar 15]       │
└─────────────────────────────┘
```
- Linhas que parecem título ("CONGREGAÇÕES:"), vazias ou repetidas vêm desmarcadas.
- Nomes que você já tem cadastrados aparecem com aviso e não são duplicados.
- O número entre parênteses (ex.: 18911) é só mostrado para ajudar a reconhecer; não é salvo.
- Código repetido ou já usado fica em vermelho e bloqueia o botão até ser trocado.

## Esboço — Word exportado
```text
Congregações do Circuito IBE-01-A
Gerado em 03/11/2026

Congregação              Código
───────────────────────  ──────
Cabiri                   48213
Cidade do Sequele 02     70519
...
Total: 16 congregações
```
Uma tabela simples, ordem alfabética, sem imagens (arquivo pequeno).

## Pontos de atenção
- Se existir limite de congregações ativas no seu plano, as que passarem do limite serão criadas como inativas e o app avisa na hora.
- Nada no banco de dados muda: usa os mesmos campos de nome e código de hoje.
- Criar/editar uma congregação manualmente continua igual.

## Detalhes técnicos
- `src/lib/congregation-import.ts` (no dispositivo): parsers CSV (coluna "Congregação", ignora cabeçalho; usa coluna "Circuito" para o título do export), XLSX (SheetJS já usado? senão JSZip lendo sharedStrings/sheet1), DOCX (JSZip + texto de parágrafos, mesmas proteções de tamanho do docx-import). Normaliza "Nome (12345)" → nome + número; heurística de título (termina em ":", tudo maiúsculo, palavra "congregações"). Dedup por nome normalizado (sem acento/caixa) contra as existentes.
- Código: 5 dígitos aleatórios via crypto, únicos contra todos os `invite_code` carregados + os do lote; validação 4–6 caracteres.
- Inserção em lote em `congregations` com o mesmo caminho do formulário atual; tratar erro de limite (trigger) caindo para `is_active=false`.
- Export: `docx-export.ts` existente (tabela simples) + share.ts no Android.
- Testes vitest: parsing dos três formatos (fixtures pequenas), detecção de título, dedup, geração de código único.
