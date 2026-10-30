# Corrigir seleção do arquivo .etim no Android

## Causa (confirmada no código)
O Android não conhece a extensão `.etim`, então informa o arquivo como "binário" (.bin / `application/octet-stream`). O botão Importar de Grandes Eventos só aceita `.etim` e `application/json`, por isso o arquivo aparece cinza. O botão do JW Library aceita `application/octet-stream`, por isso lá funciona.

## O que muda
- O seletor de arquivo de Grandes Eventos passa a aceitar também arquivos "binários" e texto (`application/octet-stream`, `text/plain`), igual ao JW Library.
- Depois de escolhido, o app confere o arquivo: se o nome não terminar em `.etim`/`.json` ou o conteúdo não for um programa válido, mostra o aviso "Este arquivo não é um programa .etim válido" e nada é importado.
- Nenhuma outra tela, dado ou o importador do JW Library é alterado.

## Detalhes técnicos
- `src/components/circuit/BigEvents.tsx` linha 366: `accept=".etim,application/json,application/octet-stream,text/plain"`.
- Em `onFile`: checar extensão e limite de tamanho (ex.: 2 MB) antes de `parseEtim`; erro amigável via toast (o `parseEtim` já lança erro para conteúdo inválido).
- Validar com `bunx tsgo --noEmit` e `bunx vitest run`. Para chegar ao celular é preciso gerar novo APK.
