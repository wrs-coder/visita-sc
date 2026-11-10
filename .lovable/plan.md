# Corrigir importação .rtf (partes não salvas) + nova regra da Série de discursos

Analisei o seu arquivo "CA-copgm27_T.rtf": tem 2 séries de discursos (10:15 e 2:45), cada uma com 3 "•", e o tempo total está no título da série.

## 1. Por que o evento ficou vazio
Na última mudança, só a Oração, o Presidente e a Música passaram a ter "horário fixo". As outras partes saíram sem essa informação. Quando o app grava todas de uma vez, o servidor recusa o pacote inteiro. Por isso o evento foi criado, mas apareceu "Nada aqui.".

**Correção**
- Toda parte importada sai com o modo de horário preenchido ("fixo" ou "automático").
- Se o servidor recusar as partes, o evento recém-criado é apagado e aparece "Não foi possível importar as partes". Assim não fica um evento vazio.
- O evento vazio que já existe: apague pelo menu ⋯ e importe de novo depois da correção.

## 2. Série de discursos (sua sugestão — concordo, é melhor)
- **Título da série** vira uma parte própria, com o horário e o tempo total que já vêm no arquivo (ex.: 10:15 · 50 min). É ela que conta no programa e empurra os horários seguintes. Não recebe número nem convite.
- **Cada "•"** continua sendo uma parte com número e convite para o ancião. O tempo de cada um é preenchido por você e serve **só como informação**: não soma no programa.
- O horário de cada "•" é mostrado em sequência a partir do horário do título (10:15, 10:30, …), conforme os tempos que você preencher.
- Se a soma dos "•" passar do tempo total da série, aparece um aviso âmbar: "Os discursos somam 55 min; a série tem 50 min".
- O aviso vermelho "Falta inserir o tempo" continua nos "•" sem tempo.

```text
┌───────────────────────────────┐
│ 10:15  Série de discursos:    │
│        Imite aqueles que...   │
│        Simpósio · 50 min      │
│ 10:15 ③ Imite... — Baraque    │
│        15 min (informativo)   │
│ 10:30 ④ Imite... — A mulher.. │
│        ⚠ Falta inserir tempo  │
│ 10:30 ⑤ Imite... — Daniel...  │
│ ⚠ Os discursos somam 55 min;  │
│   a série tem 50 min          │
│ 11:05  Cântico 57 e anúncios  │
└───────────────────────────────┘
```

O mesmo vale para o Programa em PDF, os convites e o arquivo para outro celular.

## Detalhes técnicos
- Causa: o insert em lote une as chaves dos objetos (`columns=`) e envia as ausentes como NULL; `time_mode` é NOT NULL, então o lote inteiro falha. `applyProgramRules` e `createEvent` passam a definir `time_mode ?? "auto"` e `speaker_name ?? null`; se as partes falharem, o evento é apagado + toast.
- `parseRtfProgram`: o título da série fica como parte `assigned_to: "none"`, `part_type_id: "SeriesHead"`, `duration_min` = diferença até o próximo horário; os "•" ficam com `part_type_id: "SeriesItem"`, `symposium: true`, `duration_min: null`, `time_mode: "auto"`.
- `recomputeTimes`: o SeriesItem não avança o relógio do programa. O horário exibido = horário do título + tempos dos itens anteriores. A soma dos itens é comparada com a duração do título para o aviso.
- `.etim`/`.csv` mantêm o comportamento atual (já trazem o tempo de cada discurso).
- Testes: as 2 séries do arquivo real (título com 50/45 min, itens sem tempo, numeração 2–4 e 9–11), horários do programa não deslocados, e lote de partes com `time_mode` sempre preenchido.
- Sem mudança no banco nem aumento de versão.
