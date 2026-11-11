# Vídeos tutoriais só para o superintendente de circuito

## O que muda
1. **Ajuda:** o cartão "Vídeos tutoriais" só aparece quando a pessoa entrou como superintendente. Anciãos e quem entra com código de convite (esposa, ESC) não veem o cartão.
2. **Tela de entrada (visitasc.com.br):** o app ainda não sabe quem é a pessoa antes do login. Por isso, o link "Vídeos" sai do rodapé, que fica só com Privacidade · Termos · Apoiar · Sobre.

```text
Superintendente            Ancião / convite
+----------------------+   +----------------------+
| Ajuda                |   | Ajuda                |
| [>] Vídeos tutoriais |   | [Buscar na ajuda]    |
| [Buscar na ajuda]    |   | ...                  |
+----------------------+   +----------------------+
```

## Detalhes técnicos
- Em _app.ajuda.tsx, mostrar o cartão só quando `role === "superintendent"` (useAuth já existe na tela).
- Em LoginForm.tsx, remover o link "Vídeos" e o separador antes dele, junto com os imports que ficarem sem uso.
- Nada muda em external-link.ts, que continua garantindo a abertura fora do app.
