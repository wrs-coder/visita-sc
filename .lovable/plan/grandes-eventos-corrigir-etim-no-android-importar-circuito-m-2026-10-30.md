# Grandes Eventos: corrigir .etim no Android + importar Circuito Manager (.json)

## 1. Por que o .etim fica cinza no celular (confirmado no código)
O Android não conhece a extensão `.etim` e trata o arquivo como "binário" (.bin). O botão Importar de Grandes Eventos só aceita `.etim` e JSON; o botão do JW Library aceita "binário", por isso lá funciona.

**Correção:** o seletor passa a aceitar também arquivos binários e de texto. Depois de escolhido, o app confere nome e conteúdo; se não for um programa válido aparece "Este arquivo não é um programa válido" e nada é importado.

## 2. Importar o programa do Circuito Manager (.json)
Analisei o arquivo enviado ("Feliz É Aquele Que Confia em Jeová", 2026-2027): 26 linhas, sendo 12 partes numeradas, cânticos/orações e títulos (Manhã, Tarde, Música, "Série de discursos…").

O mesmo botão **Importar** passa a reconhecer automaticamente os dois formatos (.etim e .json do Circuito Manager). Como fica:
- **Nome do evento:** preenchido com o tema do arquivo ("Feliz É Aquele Que Confia em Jeová"); data e local continuam sendo informados por você (o arquivo não traz).
- **Partes numeradas (1 a 12):** viram partes com orador, com horário, tempo e tema. O marcador "•" é removido.
- **Série de discursos:** o título da série vai como informação na frente do tema de cada parte da série (ex.: "Imite aqueles que confiaram em Jeová! — Baraque").
- **Tipo da parte (sugestão automática, editável):** "Batismo" → Discurso Batismo; "Discurso para o público" → Discurso Público; "Sentinela" → A Sentinela; marcação ENT → Entrevistas; parte de série → Simpósio; demais → Discurso.
- **Cânticos e orações:** entram como partes sem orador (como no .etim), mantendo o horário do programa.
- **Títulos sem conteúdo** (Manhã, Tarde, Música): não viram partes.
- Horários como "10:16:50.1000000" são arredondados para "10:16".

Nada muda no importador do JW Library, nos eventos já criados, nos convites ou no banco de dados.

```text
┌──────────────────────────────┐
│ Importar programa            │
│ Circuito Manager · 12 partes │
│ Nome: Feliz É Aquele Que...  │
│ Data [____]  Local [_____]   │
│ 10:00  1 Por que confiar...  │
│ 10:16  2 Série… — Baraque    │
│ 10:32  3 A mulher sunamita 🎤│
│ ...                          │
│          [Cancelar] [Criar]  │
└──────────────────────────────┘
```

## Detalhes técnicos
- `BigEvents.tsx`: `accept=".etim,.json,application/json,application/octet-stream,text/plain"`; em `onFile` checar extensão `.etim/.json` e tamanho (1 MB) antes de interpretar; ao detectar Circuito Manager pré-preencher `form.name` com o tema.
- `etim-import.ts`: remover BOM; se o JSON tiver `Programas` (array), usar novo `parseCircuitManager` que gera o mesmo `EtimPart[]` (Numero>0 → speaker; "Cântico"/"oração" → none; Duracao 0 sem cântico → ignorado; Inicio truncado HH:MM; `outline_number` = Numero). Retornar também `title` opcional.
- Testes em `big-events.test.ts` com o arquivo real: 12 partes com orador, tipos Batismo/Público/Sentinela/Entrevistas, horário 10:16, títulos ignorados, BOM aceito.
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Para chegar ao celular é preciso gerar novo APK.
