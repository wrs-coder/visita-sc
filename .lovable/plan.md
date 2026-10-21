# Modo escuro ao lado do "Modo Online" no menu lateral

## O que muda
- No menu lateral (celular e computador), o "Modo Online" e o Modo escuro ficam **lado a lado na mesma linha**:
  - à esquerda, o botão "Modo Online" ocupa a maior parte da linha, como hoje;
  - à direita, um botão compacto, da mesma altura e com os mesmos cantos arredondados, com o ícone de lua/sol e o interruptor.
- Quando o modo escuro está ligado, aparece **logo abaixo** dessa linha uma linha fina "Preto puro" com o seu interruptor.
- O funcionamento não muda: a escolha continua guardada no aparelho e vale para todas as telas.

## Detalhes técnicos
- `ThemeToggle.tsx`: a variante `sidebar` passa a mostrar só o ícone e o interruptor (o nome "Modo escuro" fica no rótulo de acessibilidade e na dica ao tocar e segurar). O "Preto puro" vira uma parte separada (`ThemeOledRow`), exibida só no modo escuro.
- `_app.tsx`: nos dois menus, `flex items-stretch gap-2` com `<ConnectionModeToggle className="flex-1 min-w-0" />` + `<ThemeToggle variant="sidebar" />`, e abaixo `<ThemeOledRow />`.
- Só muda a aparência do menu; dados, login e sincronização continuam iguais.
