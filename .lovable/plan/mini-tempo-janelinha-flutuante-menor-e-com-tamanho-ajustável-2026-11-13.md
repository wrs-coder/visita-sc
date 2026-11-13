# Mini tempo: janelinha flutuante menor e com tamanho ajustável

## O que dá e o que não dá para fazer
- O tamanho da janelinha não é escolhido pela página, e sim pelo sistema do celular (Android ou iPhone). Ele calcula o tamanho pelo **formato** da imagem: quanto mais "quadrada", maior a janelinha fica.
- Hoje a imagem é 2:1, quase quadrada. Por isso a janelinha fica alta e grande.
- O próprio sistema já deixa o orador mudar o tamanho:
  - Android: pinça com dois dedos ou toque duplo na janelinha para alternar entre pequena e grande.
  - iPhone/iPad: pinça com dois dedos.

## O que muda
1. **Formato bem achatado (faixa):** a imagem passa para o formato mais largo que o Android aceita, 2,39:1, e o relógio ocupa a altura toda. A janelinha abre como uma faixa baixa e estreita, só com os números.
2. **Sem texto extra na janelinha:** sai a linha de baixo ("Pausado" / "Seu tempo terminou"). O aviso passa a ser feito só pela cor: verde, amarelo, vermelho e vermelho piscando quando o tempo acaba. Os números ficam maiores dentro de uma janela menor.
3. **Escolha de tamanho na página antes de flutuar:** três opções em pílulas no estilo iOS, **Pequena · Média · Grande**. Cada uma usa um formato diferente: Pequena é uma faixa fina, Grande mostra os números mais altos. A escolha fica salva no aparelho.
4. **Dica sob o botão:** "Para aumentar ou diminuir, faça pinça com dois dedos na janelinha. No Android, toque duas vezes."

```text
Página do Mini tempo              Janelinha sobre o esboço
┌──────────────────────────┐      ┌──────────────────────────┐
│ MINI TEMPO DO ORADOR     │      │ Esboço                   │
│ Imite Baraque   ● Ao vivo│      │ 1. Introdução  ┌───────┐ │
│                          │      │ 2. Baraque...  │ 12:48 │ │ ← faixa pequena
│         12:48            │      │                └───────┘ │
│                          │      │ 3. ...                   │
│ Tamanho da janelinha     │      └──────────────────────────┘
│ ( Pequena | Média | Grande )
│ [ Flutuar sobre o esboço ]│
│ Pinça com dois dedos     │
│ para ajustar o tamanho   │
└──────────────────────────┘
```

## Limites
- O menor tamanho possível é decidido pelo celular. Fica uma faixa pequena, mas não chega a ser um pontinho.
- Não testei em celular real. A medida final da janelinha só aparece no aparelho.

## Detalhes técnicos
- `float-clock.ts`: canvas com proporção por tamanho: pequena 2.39:1 (360x150), média 2:1 (360x180), grande 16:9 (384x216). Fonte ajustada pela altura e pela largura, sem a linha `sub`. Piscar quando estourado, alternando a cor a cada 500 ms. `createFloatClock(frame, size)` recria o canvas e o stream ao trocar o tamanho, e fecha o PiP aberto antes de reabrir.
- `MiniClockScreen.tsx`: pílulas segmentadas de tamanho, salvas em localStorage `visitasc.mini.size`, e dica de pinça.
- i18n pt/en/es para as novas legendas. Teste da função pura que escolhe as dimensões por tamanho.
