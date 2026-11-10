# Grandes Eventos: Série de discursos + 2 novas exportações

## (01) Série de discursos no .rtf — tema completo
Cada marcador (•) abaixo de "Série de discursos" vira uma parte própria, marcada como Simpósio:
`Imite aqueles que confiaram em Jeová! — Baraque`
O tema completo vai inteiro na carta em PDF e no Word (quebra de linha, nada cortado).

## (02) Tempo em branco e destacado em vermelho
Nas partes da série importadas do .rtf o tempo fica vazio. A parte mostra em vermelho "Falta inserir o tempo" até você digitar. As outras partes continuam com o tempo calculado como hoje.

```text
┌─────────────────────────────────────┐
│ PARTES DO PROGRAMA                  │
│ 10:15 · Simpósio                    │
│ Imite aqueles que confiaram em      │
│ Jeová! — Baraque                    │
│ ⚠ Falta inserir o tempo   (vermelho)│
│ ─────────────────────────────────── │
│ --:-- · Simpósio                    │
│ Imite aqueles que confiaram em      │
│ Jeová! — A mulher sunamita          │
│ ⚠ Falta inserir o tempo   (vermelho)│
│ ─────────────────────────────────── │
│ 11:00 Cântico 45                    │
└─────────────────────────────────────┘
```
Ao abrir "Editar parte", o campo Tempo (min) aparece com borda vermelha. Depois de preencher, os horários seguintes se ajustam (botão recalcular já existente).

## (03) Duas novas opções em Exportar
```text
┌─────────────────────────────────────┐
│ Exportar                         ✕  │
├─────────────────────────────────────┤
│ Word (lista de designações)         │
│ PDF individuais (.zip)              │
│ ─────────────────────────────────── │
│ Programa do evento (PDF)       NOVO │
│ Para acompanhar durante o evento    │
│ ─────────────────────────────────── │
│ Arquivo para outro aparelho    NOVO │
│ Abra em "Importar" no outro celular │
└─────────────────────────────────────┘
```

Programa do evento (PDF elegante, A4 retrato):
```text
┌─────────────────────────────────────┐
│   ASSEMBLEIA DE CIRCUITO            │
│   Sáb, 14/11/2026 · Salão de Ass.   │
│ ─────────────────────────────────── │
│ MANHÃ                               │
│ 09:40  Música                       │
│ 10:15  Imite aqueles... — Baraque   │
│        João Silva · Cong. Centro    │
│        15 min  ✓ confirmado         │
│ 10:30  ...                          │
│ TARDE                               │
│ ...                                 │
└─────────────────────────────────────┘
```
Horário, tema completo, orador, congregação, tempo e situação (confirmado/pendente). Sem PINs nem links.

Arquivo para outro aparelho (`.visitasc` / JSON): leva nome, tipo, data, local, início e todas as partes (tema, tempo, simpósio, designados e congregações). No outro aparelho, "Importar" reconhece esse arquivo como já faz com .rtf/.csv/.etim. Nunca leva PINs, links ou tokens — o outro aparelho gera os seus.

## O que não muda
Banco de dados, convites já enviados, PINs, cartas existentes, importação de .csv/.etim/.json do Circuito Manager.

## Detalhes técnicos
- `rtf-program-import.ts`: linhas com marcador após parte `symposium` geram novas partes (`theme = "${serie} — ${item}"`, `symposium: true`, `duration_min: null`, `part_time` só na primeira; demais em modo auto); a parte "mãe" deixa de existir. Cálculo automático de duração pula partes da série. Testes novos em `rtf-program-import.test.ts`.
- `BigEvents.tsx` PartItem: aviso vermelho quando `assigned_to==="speaker" && symposium && duration_min==null`; borda `border-destructive` no campo no editor.
- Novo `program-pdf.ts` com pdf-lib via pdf-engine (fontes já embarcadas), salvo pelo share.ts existente.
- Novo `event-share-file.ts`: `exportEventFile` / `parseEventFile` com `format: "visitasc-event", version: 1`, validação de tamanho e campos; `onFile` aceita `.visitasc` e JSON com esse format antes do parser do Circuito Manager. Nome/congregação do orador vão para os campos de orador ao criar as partes.
- Testes: série → N partes com tema completo e tempo nulo; ida e volta do arquivo de troca sem tokens/PIN.
