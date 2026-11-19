# Pauta da Reunião com os Anciãos

## Resposta rápida: onde e como
- **Onde:** uma nova pílula **"Pauta"** dentro do *Programa da visita* (ao lado de Meio de semana, Fim de semana, Anciãos...). A pauta é da visita, então fica junto da semana da visita, e o antigo "Programa dos anciãos" continua funcionando igual.
- **Dashboard:** a aba **"Pastoreio"** passa a se chamar **"Anciãos"**. Nela entra o cartão **"Pauta da reunião com os anciãos"**, que recolhe e expande como os outros cartões, com os links de leitura, artigo e vídeo abrindo direto.

```text
┌──────────────────────────────┐
│ Agenda  Esboços  Visita [Anciãos]
├──────────────────────────────┤
│ ✋ Pauta – reunião c/ anciãos ▾│
│   Sexta 20/11 · 19:00        │
│   Encorajamentos · 15 min    │
│   📖 Leitura ........ 🔗     │
│   ▶ Vídeo ........... 🔗     │
│   1) Cartas · 2) Recom. ·   │
│   5) Assunto local           │
│   [ Abrir pauta completa › ] │
│ (cartões de pastoreio atuais)│
└──────────────────────────────┘
```
- **Anciãos sem cadastro:** veem e preenchem a pauta pelo acesso já existente **"Corpo de anciãos e ESC"** (código de convite da congregação), sem criar link novo. Anciãos com cadastro veem a pauta no app normalmente.
- **Como executar:** em 3 etapas, cada uma testável antes da próxima (ver final).

## Tela no celular (SC)
```text
┌──────────────────────────────┐
│ ‹  Programa da visita     ⋯  │
│ [Meio][Fim][Anciãos][Pauta]  │
├──────────────────────────────┤
│ PAUTA – REUNIÃO COM ANCIÃOS  │
│ Isa 50:4; Pro 18:13,17 ...   │
│ ┌──────────────────────────┐ │
│ │ Oração inicial  Natan  ✎ │ │
│ │ Oração recom.   ——     ✎ │ │
│ │ Oração final    Paulo  ✎ │ │
│ │ Ata             Marcos ✎ │ │
│ │ Tempo total     50 min   │ │
│ └──────────────────────────┘ │
│ ▾ Encorajamentos e conselhos │
│   15 min · Tema: ________    │
│   Informações do SC     🔒SC │
│   [ editor de esboço ... ]   │
│   Recomendações p/ meditar   │
│   📖 Leitura  ______  🔗     │
│   📄 Artigo   ______  🔗     │
│   ▶ Vídeo     ______  🔗     │
│   Info. dos anciãos  👥 Todos│
│   [ editor de esboço ... ]   │
│ ▸ 1) Cartas da filial  5 min │
│ ▸ 2) Recomendações   20 min  │
│ ▸ 5) Assunto local   10 min  │
│                              │
│ [ 🔗 Compartilhar ] [ ⤓ PDF ]│
└──────────────────────────────┘
```
Cada bloco recolhe/expande como os outros cartões. O selo (🔒SC / 👥 Todos / 👤 Coordenador) mostra quem pode escrever ali; o SC toca nele para mudar.

## Tela do ancião (acesso Corpo de anciãos)
```text
┌──────────────────────────────┐
│   Pauta – Reunião c/ Anciãos │
│   10 Cidade do Sequele       │
│   Sexta 20/11 · 19:00        │
├──────────────────────────────┤
│ Informações do SC   (leitura)│
│ ...texto do SC...            │
│ Info. dos anciãos  ✎ editar  │
│ [ editor de esboço ]         │
│ 5) Assunto local      ✎      │
│ Quem indicou: ______         │
│ Tema: ______                 │
│            [ Salvar ]        │
└──────────────────────────────┘
```
Só os campos liberados pelo SC ficam editáveis; o resto aparece só para leitura.

## Preenchido automaticamente
- Data, hora, local, tema, orações inicial/final: da *Reunião com anciãos e servos* do Programa da visita.
- 2) Recomendações (2.1, 2.2...): das recomendações já lançadas no Programa dos anciãos.
- 5) Assunto local (quem indicou, tema, fontes): dos assuntos locais já lançados.
- Tempo total: soma dos minutos de cada tópico.
Nada que o SC já digitou é sobrescrito.

## Campos de anotação
Usam o mesmo editor do modo editar esboço (barra no rodapé, estilos, listas, cores, referências bíblicas clicáveis).

## Exportar
PDF A4 no mesmo layout do modelo enviado (título, faixa de orações/ata/tempo, caixas com bordas, tempos à direita, links "Clique aqui!" funcionando).

## Etapas
1. **Pauta do SC** (inclui o cartão no Dashboard e o novo nome da aba): pílula "Pauta", tópicos, preenchimento automático, editor, PDF.
2. **Permissões por campo**: selos SC / Coordenador / Todos.
3. **Acesso dos anciãos**: anciãos cadastrados no app + nova aba "Pauta" no acesso Corpo de anciãos, com salvamento e aviso de conflito.

## Detalhes técnicos
- Nova tabela `elder_meeting_agendas` (uma por visita): `visit_id`, `superintendent_id`, `payload jsonb` (tópicos, HTML das notas, links, minutos), `permissions jsonb` (campo → `sc|coordinator|all`), `updated_at`; RLS do SC dono + anciãos da congregação; tombstone/touch triggers como as demais.
- Acesso sem cadastro: aba no painel do visitante (`visitante.painel.tsx`) via server functions de `guest.functions.ts` que validam o código de convite e **só gravam os campos com permissão `all`** (validação no servidor com zod e sanitizador de notas existente).
- Auto-preenchimento é calculado na exibição a partir de `elders_servants_meetings`, `elder_recommendations`, `elder_local_matters`; não altera esses dados.
- PDF via pdf-lib (`pdf-engine.ts`), novo `elder-agenda-pdf.ts` com teste de 1 página.
- Editor: reutiliza `RichNoteEditor` em modo compacto.
- Registro em AGENTS.md e testes de permissão (ancião não grava campo do SC).
