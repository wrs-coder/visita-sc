# Pauta — 5 ajustes (orações, alça, decisão do SC, sincronizar S-303, tela cheia)

## (01) Cabeçalho de orações

```text
┌─────────────────────────────┐
│ Orações e Ata               │
│ Oração inicial   [ Nome   ] │  fixo
│ Oração final     [ Nome   ] │  fixo
│ ── Opcionais ───────────────│
│ Oração recomendação   (●○)  │  só aparece se houver
│                 [ Nome    ] │  "Recomendações de irmãos"
│ Ata                   (●○)  │
│                 [ Nome    ] │
└─────────────────────────────┘
```
- Inicial e final sempre visíveis (tela e PDF).
- "Oração recomendação" e "Ata" com interruptor One UI; desligado = some da tela e dos 3 PDFs.
- Sem recomendações na visita, "Oração recomendação" fica oculta mesmo ligada.

## (02) Alça de redimensionamento
Todos os campos de texto/anotação da pauta (cartões, nota privada, comentários do SC, Informações do SC) ganham a mesma alça usada no modo editar esboço. Altura escolhida fica guardada no aparelho.

## (03) Decisão do SC em "Recomendações de irmãos"

```text
┌─────────────────────────────┐
│ João Silva — Servo minist.  │
│ Membros da família  ...     │
│ Grupo de campo      ...     │
│ Informações ...             │
│ ┌ Só SC 🔒 ───────────────┐ │
│ │ Comentários do SC        │ │
│ │ [                     ]≡ │ │
│ │ Decisão:                 │ │
│ │ [ Designar ][Não designar]│ │
│ └──────────────────────────┘ │
└─────────────────────────────┘
```
- Bloco visível só para o SC; não vai para anciãos nem para o PDF.
- Ao tocar "Não designar": cria nota em Notas privadas › Recomendados (nome, tipo, dados do recomendado; "Observações do superintendente" = comentários do SC).
- Se já existir nota desse recomendado (mesmo nome e congregação), ela é atualizada com a decisão final.
- "Designar" não mexe em nada. Mudar depois de "Não designar" para "Designar" não apaga a nota (só deixa de atualizar).

## (04) Botão Sincronizar em "Informações do SC"

```text
┌─────────────────────────────┐
│ Informações do SC   [⟳] Só SC│
│ [ texto...               ]≡ │
└─────────────────────────────┘
```
- Mesmo botão dos esboços pessoais.
- Busca nota S-303 da congregação com data dentro da semana da visita e insere, nesta ordem: Destaques positivos e elogios; Pontos para encorajar (Atos 11:23); Pontos preocupantes (Tito 1:5).
- Texto entra ao final do que já existe (sem apagar); se não achar, aviso "Nenhuma S-303 nesta semana".

## (05) Tela cheia com cronômetro

```text
┌─────────────────────────────┐
│ ✕   Pauta       ⏱ 12:34 ▶❚❚ │
│─────────────────────────────│
│ 1. Encorajamentos  15 min   │
│    Tema: ...                │
│    📖 📚 ▶  Clique aqui     │
│    📎 foto.jpg  📄 carta.pdf │
│ 2. Recomendações   20 min   │
│ ...                         │
│      [◀ Anterior][Próximo ▶]│
└─────────────────────────────┘
```
- Botão "Tela cheia" no topo da pauta; leitura limpa, só conteúdo preenchido.
- Mesmo cronômetro dos esboços em tela cheia (iniciar/pausar, tempo por tópico).
- Links abrem no navegador; fotos/PDF/vídeos abrem nos visualizadores já existentes.
- Cabeçalho do app oculto (modo foco), como nos esboços.

## Detalhes técnicos
- `agenda.ts`: payload ganha `showPrayerRec`, `showMinutes` (padrão ligado, compatível com pautas antigas) e, por recomendação, `scComment` e `scDecision` ('assign'|'decline'|null). Esses campos ficam no bloco privado do SC (mesmo filtro da nota privada) para nunca chegarem ao ancião nem ao PDF.
- Nota automática: upsert na tabela de notas privadas, `note_type='recomendados'`, procurando por nome+congregação; executada só ao escolher "Não designar".
- Sincronizar: leitura local-first de notas `s303` da congregação, data entre segunda e domingo da visita.
- Alça: reaproveitar o componente de altura ajustável dos esboços, chave por campo no localStorage.
- Tela cheia: novo `ElderAgendaFullscreen.tsx` reutilizando `OutlineTimer`, `AttachmentLightbox`, `AttachmentVideoLightbox` e `focus-chrome`.
- PDFs: respeitar interruptores de oração/ata. Testes Vitest para: oração recomendação oculta sem recomendações; dados do SC fora do payload do ancião; ordem do S-303; nota criada só em "Não designar".

## (06) Título e versículos editáveis

```text
┌─────────────────────────────┐
│ Cabeçalho da pauta    [✎]   │
│ Título                      │
│ [Pauta – Reunião com Anciãos]│
│ Versículos                  │
│ [Isa 50:4; Pro 18:13,17; ...]│
└─────────────────────────────┘
```
- Cada SC escolhe o título e os versículos (pode deixar versículos em branco).
- O texto atual vira o valor padrão; pautas antigas continuam iguais.
- Fica salvo no modelo da pauta (sincroniza na conta e vai na exportação de modelos) e aparece nos 3 PDFs.
- Versículos continuam clicáveis (abrem a Bíblia TNM). Só o SC edita.
- Técnico: payload ganha `headerTitle` e `headerVerses` (com padrão), incluídos no modelo; PDFs leem esses campos.
