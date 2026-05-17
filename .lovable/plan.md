# Plano de Implementação

Antes de começar, preciso confirmar alguns pontos para não errar o escopo. Vou explorar o código primeiro, mas já estruturo aqui o plano em alto nível.

## 1. Navegação avançada no Cronograma Semanal (`_app.cronograma.tsx`)

- Adicionar handlers de **swipe** (touch start/end com threshold ~50px) sobre o container principal da semana. Esquerda → próxima semana; direita → anterior.
- Adicionar botão fixo **"Próxima Semana"** (junto aos controles existentes de navegação semanal).
- Adicionar ícone de **calendário** no topo que abre um `Popover` + `Calendar` (shadcn DatePicker). Ao escolher uma data, a semana ativa salta para a semana ISO daquela data.

## 2. Fluxo pós-login + painel "Início" com seletor de congregação

- **Redirecionamento**: hoje `src/routes/index.tsx` já manda `superintendent` para `/dashboard` e os demais para `/cronograma`. Vou ampliar para que **Coordenador, Secretário e Sup. de Serviço** também caiam em `/dashboard`. Anciãos comuns e ES continuam em `/cronograma` (sem mudança).
- **Dropdown de congregação no Dashboard (apenas Superintendente)**:
  - Buscar todas as congregações onde `superintendent_id = auth.uid()` (o "circuito" do superintendente).
  - Persistir a congregação ativa em `localStorage` (`active_congregation_id`) + contexto leve via `use-active-visit`/novo hook `use-active-congregation`.
  - Todas as abas que hoje usam `private.get_user_congregation` continuam OK para anciãos; para o superintendente, as queries que dependem da congregação devem passar a usar o id selecionado. Vou centralizar isso no hook `use-active-visit` (que já localiza a visita ativa) para considerar a congregação selecionada.

## 3. Modo de Edição Supervisionada

Abas afetadas: **Escala (Estudos/Revisitas)**, **Reuniões de Campo**, **Refeições**, **Transporte**, **Checklist**.

- Adicionar, no topo de cada uma dessas páginas, um toggle **"Ativar Edição"** visível **apenas quando `role === 'superintendent'`**.
- Estado local `editEnabled` (default `false`). Quando `false`, todos os `Input/Select/Textarea/Checkbox` recebem `disabled`, e o botão de salvar fica oculto. Quando `true`, comportamento atual + botão **"Salvar Alterações"**.
- Para anciãos a UI continua exatamente como hoje (sem toggle, edição direta conforme RLS).

## 4. Partilhar Programação no painel `/visitante/painel`

Adicionar um menu "Partilhar Programação" com 3 ações sobre o bloco da semana exibida:

- **PNG**: usar `html-to-image` (`toPng`) sobre o `ref` do bloco da programação semanal e disparar download.
- **PDF**: usar `jspdf` + a imagem PNG renderizada (uma página A4, ajuste por proporção). Mantém layout fiel e simples.
- **WhatsApp**: montar texto estruturado (Dias / Horários / Designações / Irmãos) a partir dos arrays `schedule`, `meals`, `field`, `fieldMeetings`, `transport` da semana visível, e abrir `https://wa.me/?text=<encoded>`.

Bibliotecas novas: `html-to-image` e `jspdf` (instaladas via `bun add`).

## Detalhes técnicos

- Nenhuma mudança de schema/DB necessária.
- Nada nas funções server além de uma possível server fn `listSuperintendentCongregations` (já dá pra fazer client-side com Supabase + RLS existente — superintendente vê suas congregações).
- Toggle de edição é puramente client-side (RLS no Supabase já garante segurança real; o toggle é uma trava de UX para evitar edição acidental).
- Swipe implementado com handlers nativos (sem nova dependência).

## Ordem de execução

1. Instalar `html-to-image` e `jspdf`.
2. Cronograma: swipe + botão "Próxima Semana" + DatePicker.
3. `index.tsx`: redirecionar 4 funções para `/dashboard`.
4. Dashboard: dropdown de congregações + hook `useActiveCongregation`.
5. Modo edição supervisionada nas 5 abas.
6. Painel visitante: menu Partilhar + 3 exportações.

Pergunta rápida (a confirmar com o usuário antes da implementação, se necessário): a partilha por WhatsApp deve abrir contato livre (`wa.me/?text=...`) ou já com número pré-configurado? Vou assumir contato livre (padrão mais comum).
