# Pauta dos anciãos — ajustes e pauta montável

## 1. "Coordenador" vira "C.Serviço"
- O selo de quem edita passa a mostrar: **Só SC / C.Serviço / Todos**.
- "C.Serviço" continua valendo para coordenador, secretário e superintendente de serviço (a regra não muda, só o nome).

## 2. Tema/Assunto livre
- Em "Encorajamentos e conselhos", o campo **Tema/Assunto** deixa de vir preenchido com o tema da reunião. Fica vazio para o SC escrever o assunto que escolher.

## 3. Recomendações com ícones e vários links
Cada linha tem um ícone (Leitura / Artigo / Vídeo), um texto e **quantos links quiser**.

```text
┌─────────────────────────────────┐
│ Recomendações                    │
│ [📖] Salmo 23 — meditar          │
│      🔗 jw.org/...          ✕    │
│      🔗 wol.jw.org/...      ✕    │
│      + Adicionar link            │
│ [▶] Vídeo: Seja um pastor        │
│      🔗 jw.org/...          ✕    │
│ + Nova recomendação  (📖 📚 ▶)   │
└─────────────────────────────────┘
```
- Ícones iguais aos seus anexos: livro aberto (leitura), livros empilhados (artigo), botão play (vídeo).
- Na pauta (tela, cartão do Dashboard e PDF) aparece um botão **"Clique aqui"**; ao tocar, todos os links daquela linha abrem no navegador.

## 4. Pauta montável por cada superintendente
Sim, é possível. A pauta vira uma lista de **blocos** que o SC monta como quiser.

```text
┌─────────────────────────────────┐
│ Pauta            [✎ Montar]      │
├─────────────────────────────────┤
│ ≡ Encorajamentos e conselhos  ⋯ │
│ ≡ 1) Revisão das cartas  5 min ⋯ │
│ ≡ 2) Recomendações      20 min ⋯ │
│ ≡ 5) Assunto local      10 min ⋯ │
│ + Adicionar bloco                │
└─────────────────────────────────┘
 ⋯ = Renomear · Minutos · Quem edita
     · Subir/Descer · Ocultar · Apagar
```
- **Tudo editável:** título de cada bloco, minutos, ordem (arrastar ≡ ou setas), ocultar ou apagar.
- **Tipos de bloco para adicionar:** Texto livre (editor do esboço), Lista de links/recomendações, Recomendações de irmãos (puxa do Programa dos anciãos), Assunto local (puxa do Programa), Orações e ata, Cartas.
- **Modelo próprio:** o SC salva a montagem como "Meu modelo de pauta" e cada nova visita já começa com ela. Botão "Restaurar padrão" volta ao modelo atual.
- Cada superintendente tem o seu modelo; nada de um afeta outro.
- Pautas já salvas continuam abrindo: o formato antigo é convertido para blocos na primeira abertura, sem perder nada.

## 5. Sugestões para o PDF (escolha uma ou combine)

**A — Ata formal (sóbria)**
```text
 PAUTA — REUNIÃO COM OS ANCIÃOS
 Congregação X · ter 24/11 · 19:30
 ───────────────────────────────
 Oração inicial: Fulano  Final: Beltrano
 ───────────────────────────────
 1  Encorajamentos .......... 10 min
    texto...
 2  Revisão das cartas ....... 5 min
 ───────────────────────────────
                    Tempo total 50 min
```
Só preto e um tom de azul, numeração grande à esquerda, tempos alinhados com pontilhado.

**B — Cartões One UI**
Cada bloco num cartão de cantos arredondados, título em faixa azul clara, tempo numa "pílula" à direita. Mais moderno e arejado.

**C — Linha do tempo**
Coluna à esquerda com horários calculados (19:30, 19:40, 19:45...) e bolinhas ligadas por linha; conteúdo à direita. Ótimo para controlar o tempo na reunião.

Em todos: cabeçalho com versículo opcional, ícones das recomendações com "Clique aqui" clicável, espaço para anotações à mão opcional, rodapé com página e "Superintendente de circuito". Recomendo **C com o visual limpo de A**.

## Detalhes técnicos
- `agenda.ts`: novo `AgendaPayload.v2 = { blocks: Block[] }` (id, type, title, minutes, perm, hidden, data). `normalizeAgenda` converte o payload antigo em blocos. Permissões passam a ser por bloco; `mergeAgenda` aceita alterações estruturais (títulos/ordem/adicionar/apagar) só do SC.
- Recomendação: `{ kind: 'reading'|'article'|'video', text, urls: string[] }`, todas via `safeUrl`. "Clique aqui" chama `window.open` para cada url (no app nativo, Browser plugin em sequência).
- Modelo pessoal do SC: guardado no próprio registro do SC (nova coluna jsonb em uma tabela só do SC, ex. `elder_agenda_templates` com superintendent_id, owner-only RLS); visita nova copia o modelo.
- Rótulo i18n `coordinator` → "C.Serviço" (pt/en/es).
- Remover preenchimento automático do tema em `agendaView`.
- PDF em `agenda-pdf.ts` reescrito para o layout escolhido, via pdf-engine; testes de conversão antigo→blocos, permissões e links.
