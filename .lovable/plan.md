# Telas cheias: usar o máximo da tela sem esconder botões (padrão iOS / One UI)

## O que está errado hoje
O ajuste anterior colocou o "espaço de segurança" na tela inteira (em cima, embaixo e nas laterais) da leitura do capítulo, do editor da esposa, da tela cheia do esboço e da anotação de campo. Resultado: aparecem faixas vazias de fundo acima do cabeçalho, abaixo dos botões e nas bordas — no A72 isso soma muito espaço perdido. Além disso, a linha "Ponto alto / Concluído" e a barra do versículo são altas (bordas e margens generosas).

## Como iOS e One UI fazem
- O fundo das barras (topo e rodapé) se estende até a borda física da tela, por baixo da barra de status e da barra de gestos.
- Só o conteúdo clicável é empurrado para dentro, exatamente o tamanho da barra do sistema — nada a mais.
- Laterais só recebem espaço quando existe recorte real (celular deitado).
- Barras de ação compactas (cerca de 44–48 px de toque).

## O que vou mudar
1. **Leitura do capítulo (esposa e superintendente)**
   - Tirar o espaço da tela inteira.
   - Cabeçalho "Voltar" pinta o fundo até o topo; só ele recebe o recuo da barra de status.
   - Rodapé "Ponto alto / Concluído": fundo vai até a borda inferior, botões ficam logo acima da barra de gestos; altura reduzida (botões 40 px, margens menores).
   - Quando a barra do versículo estiver aberta, ela fica colada ao rodapé sem borda dupla; o recuo inferior é aplicado uma vez só, na última barra.
   - Texto do capítulo usa toda a altura restante.
2. **Editor da esposa, tela cheia do esboço e anotação de campo em tela cheia**: mesma regra — recuo só no cabeçalho e no rodapé reais, nunca na tela inteira; laterais só com recorte.
3. **Aviso de atualização** já está correto (fundo até a borda, recuo só no conteúdo) — mantém.
4. **Recuo sem exagero**: o valor vem do próprio Android, usando o maior entre os dois que ele informa (nunca a soma), sem mínimo extra nas telas cheias. Celular com 3 botões, com gestos ou sem barra: cada um recebe só o necessário.
5. Versão 5.0.7 com nota "Leitura em tela cheia aproveita mais a tela".

## Detalhes técnicos
- `src/styles.css`: novas utilidades `bar-top` / `bar-bottom` (padding = `max(env(safe-area-inset-*), var(--safe-area-inset-*))`, sem piso de 0.5rem) e `safe-x-landscape` (só em `orientation: landscape`). Mantém as atuais para não quebrar outras telas.
- `CleanReader.tsx`, `GuestWorkspace.tsx`, `OutlinesWorkspace.tsx` (camada fixa ~2638), `FieldNoteFullscreenDialog.tsx`: remover `safe-top safe-bottom safe-x` do contêiner; aplicar `bar-top` no cabeçalho, `bar-bottom` só na última barra visível; rodapé do leitor `px-3 pt-2` + botões `h-10`.
- Sem mudança em dados, banco, login ou formato salvo.
- Antes de fechar: conferir em navegador simulando inset inferior de 48 px e 0 px (screenshots) e rodar `bunx tsgo --noEmit` e `bunx vitest run`. Não consigo testar no A72/S22 real — o teste final no aparelho fica com você.
- Bump 5.0.6 → 5.0.7 / versionCode 36 nos mesmos arquivos de versão + nota no histórico.
