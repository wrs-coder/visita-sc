# Modo escuro no menu lateral e linha "Painel do Superintendente"

## 1. Mover o interruptor de Modo escuro para o menu lateral
- Sai do cabeçalho do painel; a saudação passa a usar a linha inteira.
- No menu lateral (celular e computador), fica logo abaixo do botão "Modo Online", numa linha compacta do mesmo tamanho e com os mesmos cantos arredondados: ícone de lua/sol + "Modo escuro" + interruptor. Quando o modo escuro está ligado, aparece abaixo a linha "Preto puro" com o seu interruptor.
- O funcionamento não muda: a escolha continua guardada no aparelho e vale para todas as telas.

## 2. Linha "Painel do Superintendente · Visita: Visita"
Hoje ela repete informações: o papel já está no menu lateral, e o nome da visita aparece duplicado ("Visita: Visita"). A pílula da congregação logo abaixo já mostra onde você está.

O que será feito:
- Remover essa linha.
- Manter a data como uma linha pequena acima da saudação: "QUARTA-FEIRA, 21 DE OUTUBRO".
- Quando não houver visita ativa, mostrar só um aviso discreto "Sem visita ativa" ao lado da pílula.


Essa linha é só um texto: removê-la não afeta nenhuma função. A pílula da congregação e o menu de ações (⋮) continuam iguais.

## 3. Ícone de calendário com as próximas visitas
- Novo botão redondo com ícone de calendário, na mesma fileira da pílula e dos três pontinhos.
- Ao tocar, abre uma janela só de leitura com as próximas visitas agendadas, em ordem de data: congregação, título e período (ex.: "Vila Nova · 27/10 a 02/11"). A visita atual aparece no topo marcada como "Em andamento".
- Se não houver visitas futuras, mostra "Nenhuma visita agendada".
- Funciona sem internet com os dados já guardados no aparelho.

## Detalhes técnicos
- Calendário: consulta `visits` com `end_date >= hoje`, ordenada por `start_date`, junto do nome da congregação; usa o mesmo cache local do painel (React Query + espelho offline). Componente `UpcomingVisitsDialog` com shadcn `Dialog`; i18n pt/en/es.
- `_app.dashboard.tsx`: tirar `<ThemeToggle>` e o `<p>` panelSuper/visitLabel; o aviso "sem visita ativa" vai para a fileira da pílula.
- `ThemeToggle.tsx`: nova variante `variant="sidebar"` (linha `rounded-xl border px-3 py-2.5`, cores do menu lateral via tokens), sem mudar a lógica de tema.
- `_app.tsx`: renderizar `<ThemeToggle variant="sidebar" />` abaixo de `<ConnectionModeToggle />` nos dois menus.
- Sem mudanças em dados, login ou sincronização.
