# Relógio espelhado: nunca voltar para "Aguardando o superintendente" durante a contagem

## O que foi conferido
- A contagem já é local: o celular principal manda um "retrato" (parte, tempo decorrido, pausado) a cada 4 s e a cada comando; o segundo aparelho conta sozinho a partir do último retrato. Se a internet cair, ele continua contando e só troca a pílula "Ao vivo" por "Sem sinal".
- A tela "Aguardando o superintendente" só aparece quando o segundo aparelho **não tem nenhum retrato guardado**. Hoje o retrato fica só na memória da página. Se a página recarrega, o retrato some. Isso acontece quando o navegador recarrega a aba (economia de energia, troca de app, tela cheia em alguns aparelhos ou atualização do ambiente de teste). Até o próximo envio, a tela fica em "Aguardando".
- Na versão Wi-Fi do salão (Rede local), se o celular principal responder "sem retrato" por um instante, a página também apaga o relógio.

## O que muda
1. O segundo aparelho guarda o último retrato no próprio navegador, separado por código do relógio. Ao reabrir ou recarregar, o relógio volta na hora e continua contando com o horário guardado.
2. Uma resposta vazia ou falha de conexão nunca apaga um relógio que já está contando. Ele só some quando o superintendente encerra a parte ou o espelho. Vale para internet e para Wi-Fi do salão.
3. Sem sinal, o relógio continua contando e mostra a pílula "Sem sinal" no lugar de "Ao vivo".
4. O retrato guardado vence em 6 horas, para não reaparecer no evento seguinte.

```text
┌──────────────────────────┐
│ TEMA DA PARTE  ○ Sem sinal│
│ Orador · Congregação     │
│                          │
│        12:48             │  ← continua contando
│                          │
│ Término 10:42 | Próximo… │
└──────────────────────────┘
```

## Detalhes técnicos
- `relogio.$code.tsx`: salvar `{snap, at}` em localStorage (`mirror.last.<code>`) a cada snap recebido e restaurar no primeiro render (em useEffect, por causa do SSR); descartar se tiver mais de 6 h.
- `timer-mirror-page.ts`: em `poll()`, quando `r.snap` vier nulo e já existir snap com `live`, manter o anterior; persistir em localStorage e restaurar ao carregar.
- Quando o superintendente encerra o espelho/evento, o retrato enviado já vem sem `live`, e a tela mostra o estado de "próxima parte" normalmente.
- Testes: restauração de retrato guardado (válido e vencido) e "resposta vazia não apaga relógio em contagem".
- Nada muda no celular principal, no banco de dados ou no layout.
