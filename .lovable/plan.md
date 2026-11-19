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
- **Numeração automática:** os títulos não têm mais número fixo ("1)", "2)", "5)"). Cada bloco visível ganha o número pela ordem escolhida (1, 2, 3...), na tela e no PDF.
- **Vários modelos de pauta:** o SC pode ter mais de um modelo, **exportar** (arquivo para guardar ou enviar a outro SC) e **importar**.
- **Sincronização:** os modelos ficam na nuvem da conta e aparecem em todos os aparelhos dela (celular, tablet, computador).

## 4b. Prazo para preencher e acesso sem internet
```text
┌─────────────────────────────────┐
│ Prazo para anciãos preencherem   │
│ [ seg 23/11 · 20:00        ▾ ]   │
│ Reunião: ter 24/11 · 19:30       │
│ ✓ Disponível sem internet após   │
│   o prazo                        │
└─────────────────────────────────┘
```
- O SC escolhe data e hora limite. Depois do prazo, os anciãos só podem ver, não podem mais editar (o SC continua podendo editar).
- Se o prazo for antes da reunião, a pauta fechada é guardada em cada aparelho que a abriu (SC, anciãos com conta e acesso "Corpo de anciãos"). Na hora da reunião ela abre mesmo sem internet, com os dados até o prazo, incluindo o PDF.
- Sem prazo, a pauta continua funcionando como hoje (precisa de internet).
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

Em todos: cabeçalho com versículo opcional, ícones das recomendações com "Clique aqui" clicável, espaço para anotações à mão opcional, rodapé com página e "Superintendente de circuito". **Os três modelos ficam no app:** ao tocar em PDF, o usuário escolhe Ata formal, Cartões ou Linha do tempo; a última escolha fica salva no aparelho.

## Detalhes técnicos
- `agenda.ts`: novo `AgendaPayload.v2 = { blocks: Block[] }` (id, type, title, minutes, perm, hidden, data). `normalizeAgenda` converte o payload antigo em blocos. Permissões passam a ser por bloco; `mergeAgenda` aceita alterações estruturais (títulos/ordem/adicionar/apagar) só do SC.
- Recomendação: `{ kind: 'reading'|'article'|'video', text, urls: string[] }`, todas via `safeUrl`. "Clique aqui" chama `window.open` para cada url (no app nativo, Browser plugin em sequência).
- Modelo pessoal do SC: guardado no próprio registro do SC (nova coluna jsonb em uma tabela só do SC, ex. `elder_agenda_templates` com superintendent_id, owner-only RLS); visita nova copia o modelo.
- Tabela `elder_agenda_templates` (id, superintendent_id, name, blocks jsonb, is_default, timestamps; RLS só dono; grants authenticated/service_role) entra no espelho local e na sincronização existentes (local-first-fetch/mirror-tables). Exportar/importar = arquivo .json validado com zod.
- Numeração calculada na exibição (índice entre blocos visíveis); títulos salvos sem número.
- Prazo: `deadline_at` dentro do payload; o servidor recusa salvamentos de não-SC após o prazo. Depois do prazo, o cliente guarda o snapshot da pauta no armazenamento do aparelho (por visita/código) e usa esse snapshot quando estiver sem rede.
- Rótulo i18n `coordinator` → "C.Serviço" (pt/en/es).
- Remover preenchimento automático do tema em `agendaView`.
- PDF em `agenda-pdf.ts` com três renderizadores (formal/cards/timeline) via pdf-engine, escolha guardada em localStorage; testes de conversão antigo→blocos, permissões e links.
