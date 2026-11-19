# Pauta: tópicos com cartões à escolha

## A ideia
Hoje cada bloco da pauta é de um tipo só. Passa a ser assim:

- **Tópico** = o título numerado (ex.: "1. Encorajamentos e conselhos"), com minutos.
- Dentro de cada tópico, o superintendente escolhe **quais cartões** quer, em qualquer ordem, quantos quiser (ou nenhum).

Estilos de cartão disponíveis:

| Cartão | O que tem |
|---|---|
| Anotações | editor do esboço + Tema/Assunto opcional |
| Fontes de matéria | linhas com ícone (livro / livros / play) + até 10 links |
| Informações dos anciãos | campo livre para os anciãos escreverem |
| Resposta do SC | recomendação final do superintendente |
| Recomendações de irmãos | puxa as recomendações do Programa dos anciãos |
| Assunto local | puxa os assuntos locais do Programa dos anciãos |
| Nota privada do SC | só o superintendente vê; nunca sai no PDF |

Cada cartão tem seu próprio selo **Só SC / C.Serviço / Todos** (ex.: no mesmo tópico, as anotações são só do SC e as informações dos anciãos são de todos).

## Tela "Montar pauta" (modo edição)
```text
┌─────────────────────────────┐
│ ‹ Pauta        Montar  Pronto│
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ 1  Encorajamentos e   ✎ │ │
│ │    conselhos    15 min  │ │
│ │ ─────────────────────── │ │
│ │ ≡ 📝 Anotações  Só SC ↑↓🗑│ │
│ │ ≡ ▶ Fontes de matéria  │ │
│ │       Só SC       ↑↓🗑   │ │
│ │ ≡ 👥 Info. dos anciãos   │ │
│ │       Todos       ↑↓🗑   │ │
│ │  ⊕ Adicionar cartão     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 2  Revisão das cartas ✎ │ │
│ │                  5 min  │ │
│ │ ≡ 📝 Anotações C.Serviço │ │
│ │  ⊕ Adicionar cartão     │ │
│ └─────────────────────────┘ │
│     ⊕ Adicionar tópico      │
└─────────────────────────────┘
```

Ao tocar "⊕ Adicionar cartão" abre uma folha de baixo (estilo One UI):
```text
┌─────────────────────────────┐
│        ━━━━                 │
│  Escolha o estilo do cartão │
│  📝 Anotações               │
│  ▶  Fontes de matéria       │
│  👥 Informações dos anciãos │
│  📖 Resposta do SC          │
│  🙋 Recomendações de irmãos │
│  📍 Assunto local           │
│  🔒 Nota privada do SC      │
└─────────────────────────────┘
```

## Tela normal (preenchendo)
```text
┌─────────────────────────────┐
│ 1. ENCORAJAMENTOS E   15 min│
│    CONSELHOS               ⌄│
│  Tema/Assunto: ____________ │
│  [editor de anotações]      │
│  ── Fontes de matéria ──   │
│  📖 Texto…      Clique aqui │
│  ▶  Texto…      Clique aqui │
│  ── Informações dos anciãos │
│  [editor]          Todos    │
└─────────────────────────────┘
```

## Ajustes pedidos depois

**Tópicos opcionais e automáticos.** Um tópico que só tem o cartão "Recomendações de irmãos" ou "Assunto local" some sozinho da pauta (tela, cartão do Dashboard e PDF) quando o Programa dos anciãos não tiver nenhum item daquele tipo. A numeração pula para o próximo. O SC continua vendo o tópico apagadinho no "Montar pauta", com o aviso "Oculto: nada no programa".

**Recomendações de irmãos.** Embaixo do nome e da recomendação vêm, nesta ordem e editáveis:
```text
┌─────────────────────────────┐
│ 2.1 João Silva              │
│     Servo ministerial       │
│ Membros da família          │
│ [Esposa Ana, filho Pedro  ] │
│ Grupo de campo              │
│ [Grupo 3 – Vila Nova      ] │
│ Informações espirituais,    │
│ pessoais e familiares       │
│ [editor                   ] │
└─────────────────────────────┘
```
Já vem preenchido com o que está no Programa dos anciãos. O que for editado aqui vale só na pauta; o Programa dos anciãos não muda.

**Notas privadas do SC.** Estilo de cartão "🔒 Nota privada do SC". Só o superintendente vê: ele não é enviado aos anciãos (nem no acesso por código), não aparece no cartão do Dashboard deles e nunca sai no PDF.
```text
│ ┌─────────────────────────┐ │
│ │ 🔒 Nota privada do SC   │ │
│ │ Só você vê · fora do PDF│ │
│ │ [editor + 📎 anexos]    │ │
│ └─────────────────────────┘ │
```

**Anexos (leves e por escolha do SC).** Nos cartões de Anotações, Informações dos anciãos, Resposta do SC e Nota privada aparece o botão 📎. Só aceita **foto** e **PDF**; vídeo entra apenas como link (não envia arquivo).
```text
│  📎 Anexos                  │
│  [🖼 foto.jpg  ☁ Enviar ◯ ] │
│  [📄 carta.pdf ☁ Enviar ● ] │
│  ⊕ Foto  ⊕ PDF  ⊕ Link      │
```
- Por padrão o anexo fica **só no seu aparelho** (como nos esboços) e não ocupa nada na nuvem.
- Você liga "☁ Enviar" só nos que os anciãos precisam ver.
- Antes de enviar, a foto é comprimida (lado maior 1600 px, JPEG ~70%, normalmente 200–400 KB). PDF tem limite de 5 MB e até 5 anexos enviados por pauta.
- Os arquivos não ficam no banco de dados: ficam num depósito de arquivos separado e privado, então várias reuniões no mesmo dia não deixam o app lento. Cada aparelho baixa o arquivo uma vez e guarda.
- Os anexos enviados são apagados da nuvem 30 dias depois da visita.
- Anexo de nota privada nunca é enviado. No PDF aparece a lista dos anexos enviados com link "Abrir".

## O que continua igual
- Pautas e modelos já salvos abrem sem perder nada: cada bloco antigo vira um tópico com o cartão correspondente; no modelo padrão, "Assistir/meditar" e "Informações dos anciãos" passam a ser cartões dentro de "Encorajamentos e conselhos", e "Resposta do SC" fica num tópico final sem minutos.
- Numeração automática, prazo, uso sem internet, sincronização e exportação dos modelos, e os 3 estilos de PDF (cada tópico mostra seus cartões em ordem).
- Só o SC muda a estrutura; os outros preenchem os cartões que podem editar.

## Detalhes técnicos
- `agenda.ts`: payload v3 — `AgendaBlock` (tópico: id, title, minutes, hidden, cards[]) e `AgendaCard` (id, type: notes|links|eldersInfo|scReading|recs|local, perm, showSubject, subject, html, items, notes). Conversão v2→v3 e legado na leitura (`normalizeAgenda`), juntando reco/eldersInfo ao tópico "enc" quando vierem do padrão. Limites: 30 tópicos, 12 cartões por tópico.
- `mergeAgenda`: permissão passa a ser por cartão; estrutura (tópicos e cartões) só pelo SC; prazo inalterado.
- Modelos (`elder_agenda_templates`) e arquivo exportado: aceitam versão 1 (converte) e 2; sem mudança no banco (payload é jsonb).
- `ElderAgendaView.tsx`: render por tópico → cartões; editor com subir/descer/apagar cartão e folha de estilos; `agenda-pdf.ts` (3 estilos) percorre cartões.
- Testes: conversão v2→v3 sem perda, permissão por cartão (ancião não edita cartão Só SC no mesmo tópico), SC adiciona/remove cartões, numeração por tópico, importação de modelo antigo.
- Cartões novos: `private` (removido pelo servidor em `loadAgenda` para quem não é SC; `mergeAgenda` ignora; PDF pula) e anexos `attachments[]` (id, kind photo|video|pdf|link, title, path|url).
- Tópico com só cartões recs/local e lista vazia → oculto em `agendaView`/numeração/PDF.
- Recs: override por recomendação em `card.notes[recId] = {family, fieldGroup, info}` (fallback para family_members, field_group, info de elder_recommendations); conversão do formato antigo (string) para info.
- Anexos: ficam no aparelho (outline-attachments.ts) por padrão; com 'Enviar' ligado, foto comprimida no aparelho e PDF ≤5 MB sobem para bucket privado `elder-agenda-files` (`<visit_id>/<file>`, limite 5 MB, só image/jpeg e application/pdf), máx. 5 por pauta; upload e URLs assinadas curtas só via server functions que conferem o papel; cartão privado nunca sobe; limpeza diária apaga arquivos de visitas com mais de 30 dias. Sem mudança de tabela.
- Um único rótulo por estilo (CARD_TYPE_LABEL) usado na tabela, na folha de escolha, no editor e no PDF, para os nomes nunca divergirem.
