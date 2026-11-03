# Itinerário — exportar para partilhar com os anciãos

Sim, é possível. Hoje a tela Itinerário não tem nenhuma opção de exportar. Minha sugestão: **um só botão "Exportar"** que abre uma folha com três escolhas simples (formato, estilo e período). Assim o superintendente gera o arquivo em 2 toques.

## O que cada formato entrega

- **PDF** (o mais indicado para mandar no WhatsApp): visual elegante, pronto para imprimir.
  - **Lista** — uma linha por semana, na ordem exata, com faixas de mês.
  - **Calendário** — 3 meses por folha (deitada), no máximo 2 folhas para o semestre; semanas pintadas (visita / sem visita).
- **Word (.docx)** — a mesma lista, editável, caso queira acrescentar observações.
- **Excel (.xlsx)** — tabela com colunas (Semana, Datas, Tipo, Congregação, Observação), cabeçalho fixo, para quem gosta de filtrar.

Semanas sem congregação (pioneiros, assembleia, férias, livre) aparecem no lugar certo, em cinza, com o nome do evento. Nada de dados internos (códigos de acesso, telefones, anotações) entra no arquivo.

## Mockup — botão e folha de opções

```text
┌──────────────────────────────┐
│ Circuito                     │
│ (Itinerário)(Congreg.)(Cron.)│
├──────────────────────────────┤
│ Itinerário  [⇪ Exportar] [+] │
│ ...lista atual sem mudanças..│
└──────────────────────────────┘

┌──────────────────────────────┐
│          ────                │
│ Exportar itinerário          │
│                              │
│ FORMATO                      │
│ ( PDF )( Word )( Excel )     │
│                              │
│ ESTILO        (só PDF)       │
│ ( Lista )( Calendário )      │
│                              │
│ PERÍODO                      │
│ ( Próximos 6 meses )         │
│ ( Ano de serviço )           │
│ ( Tudo agendado )            │
│                              │
│ [✓] Incluir semanas sem      │
│     visita                   │
│                              │
│ [      Gerar e partilhar   ] │
└──────────────────────────────┘
```

## Mockup — PDF em lista

```text
┌──────────────────────────────┐
│ ITINERÁRIO DO CIRCUITO SP-12 │
│ Superintendente: W. Santos   │
│ Nov 2026 – Abr 2027          │
├──────────────────────────────┤
│ NOVEMBRO 2026                │
│ 03–09  ● Cabiri (18911)      │
│ 10–16  ● Jardim Alvorada     │
│ 17–23  ○ Assembleia regional │
│ 24–30  ● Vila Nova           │
│ DEZEMBRO 2026                │
│ 01–07  ○ Semana livre        │
│ ...                          │
├──────────────────────────────┤
│ ● visita  ○ sem visita       │
│ Gerado em 03/11/2026         │
└──────────────────────────────┘
```

## Mockup — PDF em calendário (3 meses por folha, folha deitada)

```text
┌────────────────────────────────────────────────┐
│ ITINERÁRIO · Folha 1 de 2 · Nov 2026 – Jan 2027│
├───────────────┬───────────────┬────────────────┤
│ NOVEMBRO      │ DEZEMBRO      │ JANEIRO        │
│ S T Q Q S S D │ S T Q Q S S D │ S T Q Q S S D  │
│ ▓ Cabiri ▓▓▓▓ │ ░ Livre ░░░░░ │ ▓ Centro ▓▓▓▓  │
│ ▓ Jd Alvor. ▓ │ ▓ Funda 1 ▓▓▓ │ ▓ Funda 2 ▓▓▓  │
│ ░ Assembl. ░░ │ ▓ Vila Nova ▓ │ ░ Férias ░░░░  │
│ ▓ Vila Nova ▓ │ ▓ Cabiri ▓▓▓▓ │ ▓ Jd Alvor. ▓  │
├───────────────┴───────────────┴────────────────┤
│ ▓ visita  ░ sem visita       Gerado 03/11/2026 │
└────────────────────────────────────────────────┘
```

- Semestre (até 6 meses) = no máximo 2 folhas (3 + 3). Em "Tudo agendado" com mais de 6 meses, o app avisa e segue 3 meses por folha.
- Nomes longos são abreviados na grade para caber sem cortar.

Estilo iOS/One UI: folha que sobe de baixo, pílulas de escolha, um botão principal. No arquivo: tipografia Lora/Lato (já usadas nas cartas), cores suaves do app.

## Ajuda

Acrescentar no painel de Ajuda (Circuito e visitas) como exportar o itinerário.

## Detalhes técnicos

- Nova lib pura `itinerary-export.ts`: junta `visits` + `itinerary_weeks` já carregados na tela, ordena por data, filtra período e gera linhas `{ inicio, fim, tipo, titulo }` — usada pelos três formatos (testável).
- PDF: pdf-lib via `pdf-engine.ts` (regra do projeto), fontes de `public/fonts/letter`; lista em retrato; calendário em A4 paisagem com 3 colunas de mês por página (máx. 2 páginas para 6 meses).
- DOCX: `htmlToDocx` existente (`docx-export.ts`).
- XLSX: gerado com JSZip já instalado (planilha mínima com estilos), sem nova dependência.
- Partilha via `share.ts`/`saveBlob` (chunked no Android).
- Sem mudança de banco nem de versão. Testes: ordem, semanas sem visita incluídas/excluídas, período, nenhum código de acesso no conteúdo; XLSX abre e tem as linhas certas.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
