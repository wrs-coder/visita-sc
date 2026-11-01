# Tela de Ajuda dentro do aplicativo, fiel ao app real

## Por que o manual falhou e como evitar
O manual de outubro foi escrito de memória e com capturas soltas, por isso vários nomes e caminhos não batiam com o app. Na Ajuda, cada passo vai sair das telas reais:

1. **Inventário primeiro:** antes de escrever, abro cada tela no tamanho de celular e anoto os nomes exatos de botões, pílulas, abas e menus.
2. **Textos ligados aos rótulos do app:** sempre que existir, o passo usa o mesmo texto que o botão usa. Se um botão mudar de nome, a Ajuda muda junto.
3. **Botão "Abrir esta tela":** cada tema leva direto à tela real, para você conferir na hora.
4. **Ilustrações feitas com as próprias peças do app** (mesmas pílulas, cartões e ícones), em vez de fotos. Elas acompanham o visual atual e não deixam o app mais pesado.
5. **Teste automático de fidelidade:** confere que toda tela citada existe e que todo rótulo citado existe no app.
6. **Sua revisão:** você confere tema por tema.

## Onde fica: botão redondo no canto de baixo
Hoje o botão redondo com a **lupa**, no canto inferior direito, abre a busca geral (telas e ações). Ele passa a ter o ícone **?** e abre a Ajuda. A busca geral não some: ela vira a barra de busca no topo da Ajuda, que encontra **telas, ações e temas de ajuda** de uma vez.

```text
 Antes                 Depois
┌──────────────┐     ┌──────────────┐
│   (tela)     │     │   (tela)     │
│          (🔍)│     │          (?) │
└──────────────┘     └──────────────┘

┌─────────────────────────────┐
│ ‹  Ajuda                    │
│ ┌─────────────────────────┐ │
│ │ 🔍 Buscar telas e ajuda  │ │
│ └─────────────────────────┘ │
│ IR PARA                     │  ← aparece ao digitar
│  › Cronograma               │    (a busca geral de hoje)
│ AJUDA                       │
│ ┌─────────────────────────┐ │
│ │ 🔒 Entrada e segurança ▸│ │
│ │ 🗓 Circuito e visitas  ▾│ │
│ │ ┌─────────────────────┐ │ │
│ │ │[Itinerário][Congreg.]│ │ │ ← peças reais do app
│ │ └─────────────────────┘ │ │
│ │ 1. Toque em Circuito    │ │
│ │ 2. Pílula "Itinerário"  │ │
│ │      [ Abrir esta tela ›]│ │
│ │ 📋 Semana da visita    ▸│ │
│ │ 📝 Esboços e Bíblia    ▸│ │
│ │ 🎤 Grandes Eventos     ▸│ │
│ │ 📊 Relatórios e backup ▸│ │
│ │ ❓ Perguntas frequentes ▸│ │
│ └─────────────────────────┘ │
└─────────────────────────────┘
```

- Funciona sem internet. Os temas abrem e fecham.
- O atalho de teclado da busca, no computador, continua funcionando.

## Ordem para gastar poucos créditos
1. Trocar o botão, criar a tela de Ajuda com a busca e 2 temas (Entrada e segurança, Circuito e visitas). Você revisa.
2. Os demais temas, em um único passo.

## Estimativa de créditos
Não consigo dar um número exato: no modo de construção, o custo depende do tamanho do trabalho. Cada mensagem neste modo de planejamento custa 1 crédito. Fazer em duas etapas permite que você veja o gasto da primeira antes de seguir.

## O que não muda
- Nenhuma outra tela muda. Nada muda no banco de dados, no login, no PIN ou na biometria.
- A versão não sobe, e o aviso "O que há de novo" continua desligado.

## Detalhes técnicos
- `CommandPalette.tsx`: o botão flutuante passa a usar o ícone HelpCircle e abre `/ajuda`. A lista de comandos é extraída para reutilização e o atalho Ctrl/Cmd+K é mantido.
- Nova rota `src/routes/_app.ajuda.tsx`. O conteúdo fica em `src/lib/help/help-content.ts` e as miniaturas em `src/components/help/`.
- `help-content.test.ts`: toda rota citada existe, toda chave de rótulo existe em `pt.json` e a busca ignora acentos.
