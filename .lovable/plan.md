# Modo escuro no menu lateral e linha "Painel do Superintendente"

## 1. Mover o interruptor de Modo escuro para o menu lateral
- Sai do cabeçalho do painel; a saudação passa a usar a linha inteira.
- No menu lateral (celular e computador), fica logo abaixo do botão "Modo Online", numa linha compacta do mesmo tamanho e com os mesmos cantos arredondados: ícone de lua/sol + "Modo escuro" + interruptor. Quando o modo escuro está ligado, aparece abaixo a linha "Preto puro" com o seu interruptor.
- O funcionamento não muda: a escolha continua guardada no aparelho e vale para todas as telas.

## 2. Linha "Painel do Superintendente · Visita: Visita"
Hoje ela repete informações: o papel já está no menu lateral, e o nome da visita aparece duplicado ("Visita: Visita"). A pílula da congregação logo abaixo já mostra onde você está.

Sugestão (vou aplicar esta se você aprovar):
- Remover essa linha.
- Juntar a data ao título, como uma linha pequena acima da saudação, no formato atual: "QUARTA-FEIRA, 21 DE OUTUBRO".
- Quando não houver visita ativa, mostrar só um aviso discreto "Sem visita ativa" ao lado da pílula, para não perder essa informação.

Alternativas, se preferir:
- A: manter a linha, mas mostrar só o nome real da visita (ex.: "Visita de 20 a 26 de outubro"), sem o papel.
- B: mostrar o nome da visita como um texto pequeno dentro da pílula da congregação.

## Detalhes técnicos
- `_app.dashboard.tsx`: tirar `<ThemeToggle>` e o `<p>` panelSuper/visitLabel; o aviso "sem visita ativa" vai para a fileira da pílula.
- `ThemeToggle.tsx`: nova variante `variant="sidebar"` (linha `rounded-xl border px-3 py-2.5`, cores do menu lateral via tokens), sem mudar a lógica de tema.
- `_app.tsx`: renderizar `<ThemeToggle variant="sidebar" />` abaixo de `<ConnectionModeToggle />` nos dois menus.
- Sem mudanças em dados, login ou sincronização.
