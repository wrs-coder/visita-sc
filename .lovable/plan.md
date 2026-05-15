
## Resumo

Quatro mudanças significativas. Vou listar o que muda em cada uma, em linguagem simples, e o que isso implica.

---

### 1. Login do ancião sem e-mail

Na **tela inicial de login**, o acesso do ancião passa a ficar em destaque (card grande, primeiro plano), e o do superintendente fica como link secundário.

O ancião acessa apenas com:
- Número de telefone
- Designação no corpo de anciãos
- Código da congregação
- Senha (definida no 1º acesso)

**Como funciona por baixo dos panos:** o sistema cria internamente um e-mail técnico baseado no telefone (ex.: `5511999998888@elder.local`) só para o backend de autenticação. O ancião nunca vê isso — ele só usa telefone + senha. No 1º acesso (cadastro), valida o código da congregação e cria a senha. Nas próximas vezes, basta telefone + senha.

Trade-off: telefones não podem ser alterados depois (viram identificador). Recuperação de senha não funcionará por SMS — só o superintendente da congregação poderá redefinir a senha de um ancião (botão na tela de configurações).

---

### 2. Até 9 congregações ativas

- Adiciono o campo "ativa/inativa" em cada congregação.
- O superintendente pode ter quantas congregações quiser cadastradas, mas **no máximo 9 ativas** ao mesmo tempo.
- Se tentar criar uma 10ª ativa, ela é criada **inativa** automaticamente (com aviso).
- Anciãos só conseguem entrar em congregações **ativas**.
- Na tela de Congregações: switch para ativar/desativar cada uma.

---

### 3. Modelos (templates) de programação

O superintendente cria até **3 modelos reutilizáveis** ("Modelo A", "Modelo B", "Modelo C"). Cada modelo contém uma programação completa de:
- Estudos e Revisitas (turnos, horários, locais)
- Refeições (horários, anfitriões padrão)
- Transporte (estrutura padrão)

**Ao criar uma visita**, o super escolhe a congregação **e** qual modelo aplicar. O sistema copia os itens do modelo para a visita, ajustando as datas em relação ao início da visita. A partir daí, a visita é editável independentemente do modelo (editar a visita não muda o modelo, e vice-versa).

Cada congregação só vê a programação da sua própria visita ativa — isso já é garantido pelas regras de segurança atuais.

**Nova tela:** `/modelos` (só para superintendente) para criar/editar os 3 modelos.

---

### 4. Notas privadas — Visita de Pastoreio

Nas notas privadas (acessível só ao superintendente), adiciono um **tipo de nota** com campos estruturados:

- **Nota livre** (já existe hoje) — título + texto.
- **Visita de pastoreio** (novo) — campos:
  - Acompanhante
  - Nome dos envolvidos
  - Informações adicionais
  - Data da visita

Na listagem, ambos os tipos aparecem juntos com um selo indicando o tipo.

---

## Detalhes técnicos

**Banco de dados (1 migração):**
- `congregations`: adicionar `is_active boolean default true`; trigger que impede mais de 9 ativas por superintendente (força nova como inativa).
- `program_templates` (id, superintendent_id, slot 1-3, name).
- `program_template_items` (template_id, kind: study|meal|transport, day_offset, payload jsonb com horários/locais/etc).
- `visits`: adicionar `template_id` (nullable, referência ao template usado).
- `private_notes`: adicionar `note_type` (free|pastoral), `companion`, `involved_names`, `additional_info`, `note_date`.
- RLS para todas as novas tabelas.
- Função `copy_template_to_visit(template_id, visit_id)` — copia itens com datas calculadas.

**Auth do ancião:**
- `lib/auth.functions.ts`: `registerElderByPhone({phone, position, inviteCode, password, fullName})` cria auth user com email sintético derivado do telefone.
- `loginElderByPhone({phone, password})` (server fn) retorna o e-mail sintético; cliente chama `signInWithPassword`.
- Validações: telefone só dígitos, mínimo 10 caracteres.

**Páginas alteradas/criadas:**
- `/` (LoginForm): redesenhar com 2 cards — "Sou ancião" (destaque, formulário inline) e "Sou superintendente" (link).
- `/cadastro/anciao`: trocar e-mail por telefone.
- `/_app/congregacoes`: switch ativa/inativa + contador "X/9 ativas".
- `/_app/configuracoes`: no diálogo "Nova visita", adicionar Select de modelo.
- `/_app/modelos` (novo): CRUD dos 3 templates.
- `/_app/notas`: tabs "Livre" / "Pastoreio" com campos específicos.
- `/_app/tsx`: link de "Modelos" no menu (só super).

**Esqueci a senha:** continua existindo só para superintendente (quem tem e-mail). Para ancião, o super redefine via tela de configurações.

---

## Confirmação

Confirma que está tudo certo? Se sim, executo tudo de uma vez. O processo envolve 1 migração de banco e ~10 arquivos novos/editados.
