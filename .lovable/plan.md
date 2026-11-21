# Pauta: botão "Enviar pauta para os anciãos" + correção do aviso do Quadro

## Minha opinião
Ótima melhoria e necessária. Hoje "Salvar" já publica. Com a mudança, **Salvar = rascunho só seu** e **Enviar = o que os anciãos veem**. É o mesmo padrão de "Publicar" do iOS Notas compartilhadas / Samsung Notes.

Sugestões extras (incluídas):
- Selo **"Alterações não enviadas"** quando o rascunho difere do último envio.
- Confirmação curta antes de enviar (evita toque acidental).
- As **respostas dos anciãos continuam chegando na hora** para você: elas não dependem do envio.

## Mockup — Leitura (SC)
```text
┌─────────────────────────────┐
│ ‹  Pauta – Anciãos      ⟳   │
│ [Leitura][Preparar][Montar] │
│ Atualizada às 11:40         │
├─────────────────────────────┤
│ ● Alterações não enviadas   │  <- só aparece se houver
│                             │
│  1. Oração inicial ...      │
│  2. Fontes de matéria ...   │
│        ...                  │
├─────────────────────────────┤
│ [   Salvar   ]              │
│ [ ➤ Enviar pauta p/ anciãos]│
│ Último envio: 21/11 às 10:12│
└─────────────────────────────┘
```

## Mockup — confirmação
```text
┌─────────────────────────────┐
│  Enviar pauta aos anciãos?  │
│  Eles passarão a ver esta   │
│  versão. Itens "Só você vê" │
│  continuam ocultos.         │
│  [Cancelar]     [Enviar]    │
└─────────────────────────────┘
```

## Mockup — ancião antes do 1º envio
```text
┌─────────────────────────────┐
│ Pauta – Reunião com anciãos │
│                             │
│   🕒 O superintendente ainda │
│   não enviou a pauta.       │
│        [⟳ Atualizar]        │
└─────────────────────────────┘
```

## Como funciona
1. Salvar guarda seu rascunho (como hoje), sem mostrar aos anciãos.
2. Enviar copia o rascunho atual para a "versão dos anciãos" e registra data/hora.
3. Ajustes depois do envio ficam só no rascunho até um novo Enviar.
4. Anciãos (com cadastro ou por código) e o PDF deles sempre leem a última versão enviada, com as respostas atuais de todos encaixadas nos cartões.
5. **Pautas já existentes continuam visíveis**: na atualização, cada pauta atual é marcada como já enviada, para nada sumir para os anciãos.
6. App da Play Store instalado: continua funcionando, porque quem decide o que o ancião vê é o servidor. No app antigo o SC não terá o botão, então o app novo é necessário para enviar novos ajustes (as pautas atuais seguem visíveis).

## (02) Problema encontrado na sua ausência
No Quadro de anúncios (modelo Completo), aparece sempre "Faltam: presidente do meio de semana" mesmo com o presidente preenchido. Corrigir para conferir o presidente do cabeçalho.

## Detalhes técnicos
- Migração: `elder_meeting_agendas` ganha `published_payload jsonb` e `published_at timestamptz`; backfill `published_payload = payload, published_at = updated_at` para linhas existentes.
- `loadAgenda` (role elder): base = `published_payload` (null -> DTO com `notPublished: true`), sobrepondo respostas/conteúdo editável por anciãos vindos do `payload` vivo pelo id do cartão (função pura `elderView(published, live)` em agenda.ts), depois `withoutPrivate`. SC recebe `payload` + `publishedAt` + `dirty` (comparação estrutural, ignorando respostas).
- `saveAgenda` inalterado (ancião continua mesclando no `payload` vivo; cartões removidos após envio são ignorados).
- Novo server fn `scPublishElderAgenda` (requireSupabaseAuth, só SC): salva rascunho atual e copia para `published_payload`, grava `published_at`; limpeza de anexos considera paths ainda referenciados pela versão enviada.
- Anexo: elder só obtém URL assinada se o anexo estiver na versão enviada (`attachmentVisible`).
- UI: `ElderAgendaView.tsx` botão + "Último envio" + selo; `GuestElderAgenda.tsx`/rota de ancião com estado "ainda não enviada"; cache offline do ancião guarda a versão enviada.
- Board: em `board-program.ts` `boardMissing` usa `!m.chairman`; resolver finding de monitoramento como fixed.
- Testes: ancião não vê rascunho; vê após enviar; resposta nova aparece em ambos; pauta antiga (backfill) segue visível; board não avisa com presidente preenchido.
- Atualizar AGENTS.md (elder-agenda), Ajuda e notas de versão.
