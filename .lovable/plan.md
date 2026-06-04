## Plano de Implementação — Missões 1 e 2

### Missão 1 — Botão "Agendar no Cronograma" (seção VISITAS DE PASTOREIO)

**Local:** `src/routes/_app.programa-ancioes.tsx` (componente `EventCard`, branch `ev.section === "pastoral"`).

**Comportamento:**
- Adicionar botão "Agendar no Cronograma" em cada card de pastoreio.
- Visível para todos os papéis que veem a aba (ancião e superintendente); habilitado quando houver pelo menos o nome da família/irmão.
- Ao clicar, navega para `/cronograma` com search params contendo os dados do card:
  - `action=new`
  - `title` = "Visita de Pastoreio — {family_name}"
  - `family_name`, `address`, `companion`, `family_members`, `spiritual_info`, `slot_label` (passados como contexto/descrição)
  - `congregationId` = visita ativa
- A página `_app.cronograma.tsx` será ajustada para detectar `action=new` + esses params no `useEffect` inicial e abrir o dialog de criação de evento com os campos pré-preenchidos. Data fica vazia (o `slot_label` é texto livre tipo "Quinta 19h30", então vai no campo de observações/descrição para preenchimento manual da data real).

### Missão 2 — Botão "Salvar em Notas Privadas" (seção RECOMENDAÇÕES)

**Local:** `src/routes/_app.programa-ancioes.tsx` (componente `EventCard`, branch `ev.section === "recommendations"`).

**Comportamento:**
- Adicionar botão "Salvar em Notas Privadas" em cada card de recomendação.
- **Restrito a `role === "superintendent"`** (apenas o supervisor mantém notas privadas da congregação visitada).
- Ao clicar, navega para `/notas?tab=recomendados&action=new` com search params:
  - `nome` = `full_name`
  - `informacoes` = concatenação de `family_members` + `field_group` + `info` (com rótulos)
  - `tipo` = mapeado de `purpose`:
    - `ministerial_servant` → "Servo ministerial"
    - `elder` → "Ancião"
    - `cca_change` → "CCA"
    - `redesignation` → **vazio** (escolha manual)
    - `removal` → **vazio** (escolha manual)
  - `congregationId` = visita ativa
- `_app.notas.tsx` será ajustada para, ao detectar esses params, abrir a subaba "Recomendados", abrir o formulário de nova nota e pré-preencher os campos. Os params são limpos da URL após consumo.

### Detalhes técnicos

- Usar `useNavigate()` do `@tanstack/react-router` com `search` tipado.
- Validação dos search params no `validateSearch` das rotas `_app.cronograma.tsx` e `_app.notas.tsx` (campos opcionais).
- Snapshot one-way: nenhuma alteração futura no card de pastoreio/recomendação atualiza o evento/nota já criado (decisão técnica já alinhada).
- Sem migrations, sem novas dependências, sem alterações no schema.
- Manter design tokens existentes; botões usam variantes `outline` + ícones `Calendar` (Missão 1) e `StickyNote`/`FileText` (Missão 2).

### Arquivos a alterar

1. `src/routes/_app.programa-ancioes.tsx` — adicionar 2 botões em `EventCard` + handlers.
2. `src/routes/_app.cronograma.tsx` — `validateSearch` + `useEffect` que abre o dialog pré-preenchido.
3. `src/routes/_app.notas.tsx` — `validateSearch` + `useEffect` que abre subaba "Recomendados" e o form pré-preenchido.
