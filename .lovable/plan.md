# Correção: cronômetro empurrado + auditoria de botões fora da tela (celular)

Você tem razão, Wanderson: o instructions.md (regras 26 e 27) pede prévia em ASCII e aprovação antes de mudar telas, e eu coloquei o botão do "Tempo por tópico" no topo da tela cheia sem medir o espaço no celular de 393px. Nada será alterado antes da sua aprovação deste plano.

## Causa encontrada
Na **Tela cheia da pauta**, o topo tem numa só linha: `X` + título + botão "Tempo por tópico" + cronômetro completo (tempo, play, zerar, ajustes). No celular não cabe, e os botões do cronômetro saem pela direita.

## 1. Tela cheia da pauta — como fica

Antes (hoje, quebrado):
```text
┌───────────────────────────────────┐
│ X  Pauta…  [≡] 00:00 ▶ ↺ ⚙ │→ cortado
```

Depois (proposta):
```text
┌─────────────────────────────────┐
│ ▓ barra de status do Android ▓  │
│ ✕        00:12:40   ▶  ↺  ⚙    │ ← uma linha: fechar + cronômetro (sem título)
│ ┌─ Tempo por tópico (se ligado)┐│
│ │ ◀  2. Saúde espiritual  ▶   ││
│ │    faltam 03:20   ▶  ↺      ││
│ │ ▸ Tempos dos tópicos        ││
│ └─────────────────────────────┘ │
│   … conteúdo da pauta …         │
│ [ ◀ Anterior ]   [ Próximo ▶ ] │
│ ▓ barra de navegação Android ▓  │
└─────────────────────────────────┘
```
Fonte do cronômetro muito grande (quebra automática):
```text
│ ✕     00:12:40                  │
│            ▶   ↺   ⚙            │ ← botões descem para a linha de baixo
```
Ao tocar em ⚙ (configurações do cronômetro):
```text
┌─ Configurações do cronômetro ───┐
│ Tamanho da fonte   [ − ] [ + ]  │
│ …opções atuais…                 │
│ Tempo por tópico        [ ◯━ ]  │ ← o antigo botão [≡] vira esta chave
└─────────────────────────────────┘
```
- Título sai da tela cheia; o X e o cronômetro dividem a mesma linha.
- Se a fonte aumentar e não couber, só os botões (▶ ↺ ⚙) quebram para baixo; nada sai da tela.
- O botão [≡] some do topo e vira a chave "Tempo por tópico" dentro de ⚙. A escolha continua guardada no aparelho.
- Fora da tela cheia, a chave também fica no ⚙ do cronômetro (sem botão solto).
- Cronômetro e tempo por tópico continuam independentes.

## 2. Auditoria de botões fora da tela ou sob as barras do Android
Vou abrir o app num celular simulado de 393×687 (o seu tamanho) e conferir, tela por tela, se algum botão:
- sai pela lateral (largura maior que a tela), ou
- fica embaixo da barra de status ou da barra de navegação/gestos do Android.

Telas verificadas: Início (4 páginas), Pauta (Leitura, Preparar, Montar, Tela cheia, tempo por tópico ligado), Esboços (edição, modo esboço, tela cheia), Visita, Reuniões, Quadro de anúncios, Circuito, Estudo e Anotações, Bíblia, Ajuda, diálogos e folhas que sobem de baixo.

Para cada problema encontrado, corrijo da mesma forma (quebrar em duas linhas ou dar espaço seguro das barras), sem mudar dados nem funções. Se algum caso exigir mudar o desenho de uma tela, te mostro o esboço ASCII antes.

No fim te entrego a lista: tela → o que estava errado → o que foi feito, com capturas.

## 3. Ajuda
Atualizar o trecho da Ajuda sobre "Tempo por tópico" com a nova posição do cronômetro.

## Detalhes técnicos
- `ElderAgendaFullscreen.tsx`: remover título; header `flex flex-wrap` com X `shrink-0` + `OutlineTimer` `min-w-0`, botões do timer em grupo que quebra quando a fonte cresce; `pt-safe` mantido.
- `AgendaTopicToggle` removido do topo e do card da pauta; vira item (Switch) no painel de configurações do `OutlineTimer`, exibido só quando o timer é da pauta (`agenda-*`), usando o mesmo `useTopicRowPref`. Busca de consumidores do `OutlineTimer` para não afetar esboços.
- Auditoria via Playwright em 393×687: script detecta elementos `button, a, [role=button]` com `getBoundingClientRect()` fora de `0..innerWidth` ou sobrepostos às faixas `env(safe-area-inset-*)` simuladas; capturas por tela.
- Barras inferiores fixas/folhas: garantir `pb-safe` onde faltar.
- Rodar testes existentes de elder-agenda e help-content; `bunx tsc --noEmit` limpo.
