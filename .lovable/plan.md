# Tela de Ajuda dentro do aplicativo — fiel ao app real

## Por que o manual falhou e como evitar
O manual de outubro foi escrito a partir da memória e de capturas soltas, e vários nomes e caminhos não batiam com o app. Na tela de Ajuda, cada passo vai nascer das telas reais, e não de descrição:

1. **Inventário primeiro:** antes de escrever, abro cada tela no tamanho de celular (393 px) e anoto os nomes exatos de botões, pílulas, abas e menus, como aparecem hoje.
2. **Textos ligados aos rótulos do app:** sempre que existir, o passo usa o mesmo texto de tradução que o botão usa. Se um botão mudar de nome, a Ajuda muda junto.
3. **Botão "Abrir esta tela":** cada tema leva direto à tela real, então você confere na hora.
4. **Ilustrações = miniaturas desenhadas com os próprios componentes do app** (mesmas pílulas, cartões e ícones), não fotos. Elas acompanham o visual atual e não pesam no app.
5. **Teste automático de fidelidade:** um teste confere que toda tela citada na Ajuda existe e que todo rótulo citado existe nas traduções do app. Se algo sumir, o teste falha.
6. **Sua revisão:** entrego tema por tema e você confirma antes de eu seguir.

## Como fica (padrão iOS / One UI)

```text
┌─────────────────────────────┐
│ ‹  Ajuda                    │
│ ┌─────────────────────────┐ │
│ │ 🔍 Buscar (ex.: PIN)     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ 🔒 Entrada e segurança ▸│ │
│ │ 🗓 Circuito e visitas  ▾│ │
│ │ ┌─────────────────────┐ │ │
│ │ │[Itinerário][Congreg.]│ │ │ ← miniatura real
│ │ └─────────────────────┘ │ │
│ │ 1. Toque em Circuito    │ │
│ │ 2. Pílula "Itinerário"  │ │
│ │ 3. Botão "+"            │ │
│ │      [ Abrir esta tela ›]│ │
│ │ 📋 Semana da visita    ▸│ │
│ │ 📝 Esboços e Bíblia    ▸│ │
│ │ 🎤 Grandes Eventos     ▸│ │
│ │ 📊 Relatórios e backup ▸│ │
│ │ ❓ Perguntas frequentes ▸│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Novo item "Ajuda" (ícone ?) no menu lateral, só para o superintendente.
- Temas abrem e fecham. A busca filtra enquanto você digita.
- Funciona sem internet.

## Ordem para gastar poucos créditos
1. Inventário das telas e criação da tela de Ajuda com 2 temas (Entrada e segurança, Circuito e visitas). Você revisa.
2. Os demais temas, em um único passo.

## O que não muda
- Nenhuma tela que já existe muda, exceto o novo item no menu.
- Nada muda no banco de dados. O login, o PIN e a biometria só aparecem como texto explicativo.
- A versão não sobe, e o aviso "O que há de novo" continua desligado.

## Detalhes técnicos
- Nova rota `src/routes/_app.ajuda.tsx`; conteúdo em `src/lib/help/help-content.ts` com `{ id, title, route, steps: { labelKey?, text }[] }`.
- Miniaturas: pequenos componentes em `src/components/help/` reutilizando os componentes reais de pílula e cartão.
- `help-content.test.ts`: toda `route` existe em `routeTree.gen`, toda `labelKey` existe em `pt.json`; busca sem acentos ("pin" encontra o tema de segurança).
