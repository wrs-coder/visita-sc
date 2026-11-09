# Subtítulo "A ser preenchido pelos Anciãos" no Programa da visita

## Avaliação do seu plano
Seu plano está bom e seguro. Pontos que conferi no código:
- Os campos que você quer que o SC também edite (cânticos, informações adicionais, dia e horário, discursos) **já podem ser editados por você** quando o "Modo edição" está ligado. Isso continua igual: não abro nada novo para os anciãos.
- Hoje, na tela dos anciãos (sem modo edição), esses campos aparecem só para leitura. Isso também continua.
- O que muda de verdade é a **ordem dos campos** e o **subtítulo com contador**. Nada muda no banco de dados, no Painel, no resumo do dia, nos PDFs ou no botão Sincronizar dos esboços (eles leem os mesmos dados).
- Subtítulo leve (sem caixa que recolhe), como você pediu: uma linha fina com o texto e o contador "2/3". Faltando campo, o contador fica vermelho e o campo vazio ganha borda vermelha, igual à subaba Campo.

## Mockups

```text
TRANSPORTE                         REFEIÇÕES
┌────────────────────────────┐    ┌────────────────────────────┐
│ Seg · 08:00                │    │ Almoço · 12:00 (só SC)     │
│ ── A ser preenchido    1/2 │    │ ── A ser preenchido    0/3 │
│    pelos Anciãos ───────── │    │    pelos Anciãos ───────── │
│ Nome do motorista          │    │ Nome do anfitrião          │
│ [Júlio                   ] │    │ [                        ]🔴│
│ Telefone                   │    │ Local / Telefone           │
│ [                        ]🔴│    │ [                        ]🔴│
└────────────────────────────┘    └────────────────────────────┘

ESTUDOS E REVISITAS
┌────────────────────────────┐
│ Horário  09:30  🔒 (só SC) │
│ ── A ser preenchido    2/3 │
│ Local de encontro [......] │
│ Telefone / Acompanhante    │
└────────────────────────────┘

MEIO DE SEMANA                     FIM DE SEMANA
┌────────────────────────────┐    ┌────────────────────────────┐
│ Informações adicionais (SC)│    │ Informações adicionais (SC)│
│ ── A ser preenchido    3/4 │    │ ── A ser preenchido    1/2 │
│ Dia da reunião  [Qua    ▾] │    │ Dia da reunião  [Dom    ▾] │
│ Hora da reunião [19:30   ] │    │ Hora da reunião [        ]🔴│
│ Presidente      [Ramon   ] │    │ ────────────────────────── │
│ Oração final    [       ]🔴│    │ Cântico inicial            │
│ ────────────────────────── │    │ Discurso público           │
│ Tema: Discurso de serviço  │    │ Discurso final             │
│ Cântico final              │    │ Cântico final              │
└────────────────────────────┘    └────────────────────────────┘

PIONEIROS  /  ANCIÃOS E SERVOS (mesma ordem)
┌────────────────────────────┐
│ Informações adicionais (SC)│
│ Dia e horário (SC)         │
│ Tema                       │
│ ── A ser preenchido    1/3 │
│ Oração inicial  [Júlio   ] │
│ Oração final    [       ]🔴│
│ Local da reunião[       ]🔴│
└────────────────────────────┘
```

## O que será feito
1. Criar o subtítulo leve reaproveitando o contador e a cor vermelha que já existem na subaba Campo.
2. Transporte, Refeições, Estudos: inserir o subtítulo acima de Motorista / Anfitrião / Local de encontro. Em Estudos, o Horário fica travado para anciãos (o SC continua editando).
3. Reuniões: reordenar os campos nas 4 subabas exatamente na ordem do seu texto, com o subtítulo sobre os campos dos anciãos. A visão só-leitura segue a mesma ordem.
4. Permissões: mantidas como hoje (SC edita tudo com Modo edição; anciãos só os campos do bloco).
5. Rodar todos os testes e a verificação de erros.

## Detalhes técnicos
- Novo `EldersSubtitle` em `TemplateChrome.tsx` (usa `countFilled`/`MissingBadge`, sem estado de recolher).
- Arquivos: `MeetingPanels.tsx` (4 painéis, só reordenação de JSX; `TemplateExtraBlock` e `DayTimePicker` intactos), `_app.transporte.tsx`, `_app.refeicoes.tsx`, `_app.programa-ancioes.tsx` (horário `disabled={!isSuper}`).
- Sem migração, sem mudança de rotas ou de funções do servidor.
