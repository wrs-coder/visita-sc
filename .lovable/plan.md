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

## Por que isso não atrasa a contagem
- O retrato guarda o horário exato em que o tempo foi medido. Ao reabrir, o relógio soma o tempo que passou desde então. Por isso ele volta já no segundo certo, não de onde parou.
- Quando chega um retrato novo do celular principal, o relógio se corrige na hora. O celular do superintendente continua sendo o relógio oficial.
- O relógio do segundo aparelho nunca altera o relógio do superintendente.

## Fase 2: mini relógio flutuante para o orador ("Mini tempo")
Para o orador que usa o esboço no próprio celular ou tablet, quando não houver um aparelho extra no púlpito. Pode ser usado sozinho ou junto com o relógio do púlpito.

- No Controle de tempo, ao lado de cada orador, um botão "Mini tempo" gera um link e um QR Code só daquela parte.
- O link mostra apenas a parte desse orador. Antes dela, aparece "Seu discurso começa às 10:15". Depois dela, o link para de mostrar o tempo.
- A contagem é a mesma do relógio do púlpito e começa no mesmo momento, quando o superintendente inicia a parte.
- Na página, o botão "Flutuar" transforma o relógio numa janelinha que fica por cima de outros apps, como o JW Library ou um PDF. O orador pode arrastar a janelinha para um canto.
- A janelinha usa as mesmas cores: verde, amarelo a 2 min, vermelho a 1 min e "+0:15" depois do tempo.
- Não precisa instalar o app nem criar conta.

```text
┌──────────────────────────┐
│ Esboço (JW Library)      │
│ 1. Introdução ...  ┌────┐│
│ 2. Abraão confiou  │12:48││ ← janelinha flutuante
│    em Jeová ...    └────┘│
│ 3. ...                   │
└──────────────────────────┘
```

Limites: a janelinha por cima de outros apps funciona no Chrome do Android e no Safari do iPhone/iPad (iOS 15 ou mais novo). Em navegadores sem esse recurso, o mini relógio fica numa faixa fina no topo da página. Primeiro vou validar a janelinha num celular Android de verdade. Se ela não se comportar bem, mantenho só a faixa.

### Detalhes técnicos da Fase 2
- Link `/relogio/<code>?p=<partId>`, usando o mesmo canal e o mesmo retrato. O visualizador filtra pela parte, então não precisa de canal novo nem de mudança no banco.
- O relógio flutuante é desenhado em canvas e enviado por `captureStream()` para um `<video>` com `requestPictureInPicture()`, com fallback para `documentPictureInPicture` e depois para a faixa fixa.
- O botão "Mini tempo" fica na lista de partes do Controle de tempo, com uma folha de QR Code igual à do TimerMirrorSheet.
- Roadmap: incluir "Relógio espelhado: retrato guardado" e "Mini tempo do orador".
