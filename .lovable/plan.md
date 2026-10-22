# Esboços da Semana: tipo de discurso, campos e botão Detalhes

Só para esboços (não Consideração de Campo) na pasta "Esboços da Semana". Esboços já criados continuam iguais: sem tipo escolhido, nada aparece. Nada muda no banco, nas regras ou no salvamento.

## 1. Seletor "Tipo de esboço" (modo edição)
Opções: Discurso Público; Discurso de Serviço – Inicial; Reunião – Pioneiros; Reunião – Anciãos; Discurso de Serviço – Final; Discurso — Eventos.

## 2. Campos por tipo
| Tipo | Campos |
|---|---|
| Discurso Público | Título, Cântico inicial |
| Serviço – Inicial | Título, Cântico, Oração |
| Serviço – Final | Título, Cântico, Próxima congregação |
| Discurso — Eventos | Título, Cântico, Tema do próximo discurso, Próximo orador |
| Reunião – Pioneiros | Título, Oração inicial, Oração final |
| Reunião – Anciãos | Título, Oração inicial, Oração final |

Todos editáveis à mão; ficam recolhidos em "Editar detalhes" no modo leitura, como na Consideração de Campo.

## 3. Botão Sincronizar (puxa da aba Reuniões e Discursos da visita ativa)
- Público: Cântico inicial ← Fim de Semana › Cântico inicial
- Serviço – Final: Cântico ← Fim de Semana › Cântico final
- Serviço – Inicial: Cântico ← Meio de Semana › Cântico final; Oração ← Meio de Semana › Oração final
- Pioneiros: Oração inicial/final ← Pioneiros
- Anciãos: Oração inicial/final ← Anciãos e Servos
- Só preenche campos com valor na origem; Eventos e campos sem origem ficam manuais. Sem visita ativa ou sem internet, o botão fica desativado com aviso.

## 4. Botão ℹ️ Detalhes
O mesmo botão da Consideração de Campo, no modo esboço e na tela cheia, sem parar o cronômetro. Mostra só os campos preenchidos (Tipo, Título, Cântico, Oração, Próximo orador, Próxima congregação, Tema) e tem o botão Sincronizar.

## Verificação
- Testes novos: campos exibidos por tipo; mapa de sincronização por tipo; campos vazios fora do balão; esboço antigo sem tipo não mostra nada.
- Todos os testes + verificação de tipos; conferência no celular e no computador.

## Detalhes técnicos
- Novos campos opcionais no `content_json` do esboço (`talk_kind`, `talk_title`, `song`, `prayer`, `opening_prayer`, `closing_prayer`, `next_congregation`, `next_theme`, `next_speaker`), mesmo padrão de `territory/assistants`: entram no push/pull existente de `_app.consideracoes-campo.tsx` e na fila offline; ausentes = vazios. Sem migration.
- `src/lib/talk-outline-info.ts`: definição dos tipos → campos e mapa de origem (puro, testável); `fieldNoteInfoRows` ganha irmão `talkOutlineInfoRows`.
- Sincronização lê `weekend_meetings`/`midweek_meetings`/`pioneer_meetings`/`elders_servants_meetings` da visita e cânticos via `loadMergedVisitExtras`/`useVisitTemplateExtras` (modelo + ajuste da visita, mesma regra da aba).
- `FieldNoteInfoButton` recebe `rows` genéricas; `FieldNoteFullscreenDialog` passa as linhas do tipo certo.
- i18n pt/en/es simétricas (`talkOutline.*`).
