# Vídeos tutoriais: aviso "ERR_BLOCKED_BY_RESPONSE"

## O que está acontecendo (provável)
A correção anterior funciona fora da prévia: no teste, o link abriu a playlist numa aba nova.
A tela de teste do Lovable (a prévia) abre o app dentro de uma "caixa protegida". Uma aba aberta a partir dela herda essa proteção, e o YouTube recusa abrir nessas condições. Por isso aparece "ERR_BLOCKED_BY_RESPONSE".
O site publicado (visitasc.com.br) e o app no celular não usam essa caixa protegida.

## Passos
1. Primeiro, confirmar o diagnóstico abrindo o link pelo site publicado (visitasc.com.br/ajuda), depois de publicar.
2. Se a playlist abrir lá, o app não precisa de outra mudança.
3. Para não deixar ninguém sem saída, colocar um botão pequeno "Copiar link" ao lado do cartão "Vídeos tutoriais". Ao tocar, aparece a mensagem "Link copiado — cole no navegador".

```text
+--------------------------------+
| [>] Vídeos tutoriais        ↗  |
|     Aprenda passo a passo      |
|     no YouTube                 |
|                  Copiar link   |
+--------------------------------+
```

## Detalhes técnicos
- Adicionar um botão "Copiar link" que usa navigator.clipboard e mostra a mensagem com toast, na Ajuda e ao lado de "Vídeos" na tela de entrada.
- Nada muda em external-link.ts.
