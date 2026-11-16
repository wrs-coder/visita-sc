# Pastoreio integrado: Cronograma + Notas Privadas, Esboço do pastoreio e balão de anexos

## (01) Programa da visita › aba Pastoreio — uma ação, dois destinos

Hoje cada visita de pastoreio tem só "Agendar no Cronograma". O botão passa a abrir uma folha (padrão iOS/One UI) com duas chaves, ambas ligadas por padrão:

```text
┌──────────────────────────────┐
│ Família Silva                │
│ Acomp.: Ir. João             │
│ [ 📅 Agendar / Salvar  ▸ ]   │
└──────────────────────────────┘
        ▼ toca
┌──────────────────────────────┐
│ ▬▬                           │
│ Salvar pastoreio             │
│                              │
│ 📅 Agendar no Cronograma  [●]│
│ 🔒 Salvar em Notas Privadas[●]│
│                              │
│ [ Cancelar ]   [ Confirmar ] │
└──────────────────────────────┘
```

Preenchimento da nota "Pastoreio" criada:
- Ancião/S.M acompanhante → Acompanhante
- Família/Irmão(ã) + Membros da família → Nome dos envolvidos
- Endereço + Informações espirituais e pessoais → Informações adicionais
- Data: o dia do evento; congregação: a da visita.

A aba Recomendações continua exatamente como está.

## (02) Notas Privadas › Pastoreio — cartões estilo Samsung Notes + "Esboço do pastoreio"

Lista em cartões só com o essencial. Ao tocar, abre a nota sozinha em tela própria.

```text
Lista                          Nota aberta
┌──────────────────────────┐   ┌──────────────────────────┐
│ Pastoreio      🔍 ⋯ +Novo│   │ ←   Família Silva   ⋯ 💾 │
│ ┌──────────────────────┐ │   │ Data       16/11/2026    │
│ │ Família Silva        │ │   │ Acompanh.  Ir. João      │
│ │ 16 nov · Ir. João    │ │   │ Envolvidos Silva, Ana…   │
│ │ 📝 Esboço · 🖼 2     │ │   │ Inform.    Rua…          │
│ └──────────────────────┘ │   │──────────────────────────│
│ ┌──────────────────────┐ │   │ Esboço do pastoreio      │
│ │ Ir. Pedro            │ │   │        📖  ⤢  🖼2        │
│ │ 10 nov · Ir. Carlos  │ │   │ • Salmo 23:1 …           │
│ └──────────────────────┘ │   │ • Ponto principal…       │
└──────────────────────────┘   │ [Aa][12▾][T][T▣][⋯] ←dock│
                               └──────────────────────────┘
```

- "Esboço do pastoreio" usa o mesmo editor de Esboços Pessoais / Estudo e Anotações: formatação, textos bíblicos automáticos, links, imagens, vídeos, modo esboço (📖) e tela cheia (⤢).
- As outras 5 categorias continuam como hoje.
- Exportar PDF/WhatsApp das notas pastorais ganha o texto do esboço.

## (03) Balão de anexos (imagens e vídeos)

Troca a faixa de miniaturas por um balão pequeno, igual ao contador de textos bíblicos, nos modos edição e esboço:

```text
Topo do esboço:   📖 3   🖼 4      ← balões
                         ▼ toca
┌──────────────────────────────┐
│ ▬▬  Anexos (4)               │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │
│ │ 🖼 │ │ ▶  │ │ 🖼 │ │ 🔗 │  │
│ └────┘ └────┘ └────┘ └────┘  │
│ Foto 1  Vídeo  Foto 2  Link  │
└──────────────────────────────┘
  toca num item → abre em tela cheia / reproduz
```

- O balão só aparece quando há anexos; no modo edição a folha também mostra "+ Adicionar" e o X para remover.
- Libera mais espaço para o texto (a faixa fixa de miniaturas sai).
- Vale para Esboços Pessoais, Estudo e Anotações e o novo Esboço do pastoreio.

## (04) Ficar no Programa da visita + "Salvar todos" (Pastoreio e Recomendações)

Depois de agendar ou salvar, o app **não sai mais** da tela: aparece só um aviso curto embaixo, com atalho opcional.

```text
┌──────────────────────────────┐
│ Pastoreio                    │
│ ┌──────────────────────────┐ │
│ │ Família Silva   ✓ 📅 ✓ 🔒│ │ ← selo de já salvo
│ └──────────────────────────┘ │
│ [ Salvar todos (5) ▸ ]       │
│ ╭──────────────────────────╮ │
│ │ ✓ Salvo  ·  Ver Cronograma│ │ ← aviso some em 4 s
│ ╰──────────────────────────╯ │
└──────────────────────────────┘
```

"Salvar todos" abre um painel de ajuste antes de gravar:

```text
┌──────────────────────────────┐
│ ▬▬  Salvar todos (5)         │
│ Destino: [📅 Cronograma][🔒 Notas]│
│ ☑ Família Silva   📅 [●] 🔒 [●]│
│ ☑ Ir. Pedro       📅 [●] 🔒 [ ]│
│ ☐ Fam. Costa  (já salvo)     │
│ ☑ Ir. Ana (Recom.)    🔒 [●] │
│                              │
│ [ Cancelar ]  [ Salvar 4 ]   │
└──────────────────────────────┘
```

- Cada linha pode ser desmarcada ou ter um destino desligado; Recomendações só têm Notas Privadas (como hoje).
- Eventos já salvos aparecem desmarcados, para não duplicar.
- Minha opinião: fazer os dois. Ficar na tela resolve o dia a dia; "Salvar todos" economiza tempo no início da semana.

## Integridade
- Nenhuma mudança no banco: o esboço e os anexos da nota pastoral ficam no campo de dados extras que a nota já tem; notas antigas abrem normalmente (esboço vazio).
- Agendar no Cronograma continua gravando igual; Notas antigas, sincronização, lixeira e backup inalterados.
- Testes novos: mapeamento dos campos Pastoreio → Nota; nota pastoral antiga sem esboço carrega; balão conta corretamente imagens/vídeos.

## Detalhes técnicos
- `_app.programa-ancioes.tsx`: `pendingAction` passa a aceitar `kind: "pastoral-both"` com dois toggles; função pura `pastoralEventToNote(ev, visit)` em `src/lib/` (testada) gera `companion`, `involved_names`, `additional_info`, `note_date`.
- `_app.notas.tsx`: aba pastoral renderiza grade de cartões; nova rota/estado `noteId` abre a nota em tela focada (focus-chrome) com `RichNoteEditor`, conteúdo em `payload.outline_html` e `payload.attachments` (private_notes.payload já é jsonb).
- `OutlineAttachmentsBar` vira `AttachmentsBubble` + folha com grade, reutilizando `AttachmentLightbox`/`AttachmentVideoLightbox`; ajustar o desconto de altura do editor imersivo (remove os 5rem).
- Remover a navegação após confirmar; toast sonner com ação "Ver"; "já salvo" detectado por nota/evento existente com a mesma origem (marca `payload.source_event_id` / id do evento no cronograma), sem mudança no banco; painel em lote reutiliza as mesmas funções de gravação unitária.
- i18n pt/en/es, Ajuda (/ajuda) e AGENTS.md atualizados.
