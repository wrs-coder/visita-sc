# Ajuda: vídeos só para o superintendente e botão de fechar

## O que muda
1. **Vídeos na Ajuda:** o cartão "Vídeos tutoriais" só aparece quando a pessoa entrou como superintendente. Anciãos e quem entra com código de convite (esposa, ESC) não veem o cartão.
2. **Botão de fechar na Ajuda:** um X redondo no canto direito do título "Ajuda", no estilo do iOS. Ao tocar, volta para a tela onde a pessoa estava. Se a Ajuda foi aberta direto pelo link, volta para o Painel.
3. **Tela de entrada (visitasc.com.br):** o app ainda não sabe quem é a pessoa antes do login. Por isso, o link "Vídeos" sai do rodapé, que fica só com Privacidade · Termos · Apoiar · Sobre.

```text
Superintendente            Ancião / convite
+----------------------+   +----------------------+
| Ajuda            (X) |   | Ajuda            (X) |
| [>] Vídeos tutoriais |   | [Buscar na ajuda]    |
| [Buscar na ajuda]    |   | ...                  |
+----------------------+   +----------------------+
```

## Detalhes técnicos
- Em _app.ajuda.tsx, mostrar o cartão só quando `role === "superintendent"` (useAuth já existe na tela).
- Botão X: `router.history.back()` quando há histórico; se não houver, `navigate({ to: "/dashboard" })`. Tem `aria-label="Fechar"` e área de toque de 44px.
- Em LoginForm.tsx, remover o link "Vídeos" e o separador antes dele, junto com os imports que ficarem sem uso.
- Nada muda em external-link.ts, que continua garantindo a abertura fora do app.
