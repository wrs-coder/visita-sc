# Correções da 5.0.2 no aparelho

## O que causou os itens 01 e 03

O APK foi gerado com `npx cap copy android` + `npx cap update android`. Esses comandos **só copiam** as telas que já estavam prontas na pasta do pacote. Eles **não refazem** as telas. Por isso o APK saiu com o número 5.0.2, mas com telas antigas, sem:
- a janela "O que há de novo" (item 01);
- o botão de relógio, a pílula de tempo e os ajustes dela (item 03, que confirma isso porque o botão nem aparece).

O código desses recursos está certo e testado. O que falta é empacotar as telas novas. Esta correção também impede que isso aconteça de novo.

## O que será feito

### 1. Impedir APK com telas antigas
- Ao refazer as telas, gravar junto um "carimbo" com a versão do app e a data/hora.
- Novo comando único `npm run android:copy`: refaz as telas e depois roda `cap copy` e `cap update`. Assim você mantém seu jeito de trabalhar com o Android Studio, mas sempre com telas novas.
- Verificação automática antes de copiar: se as telas na pasta do pacote forem de outra versão, ou de antes da última mudança no código, o comando para e mostra uma mensagem clara em português.
- Atualizar o CAPACITOR.md e o ANDROID_RELEASE.md: explicar que `npx cap copy` sozinho não serve e qual comando usar.

### 2. Ver no aparelho qual versão das telas está instalada
- Em Configurações (área "Sobre"), mostrar uma linha discreta: "Telas: 5.0.2 · 25/10/2026 21:00". Assim você confere na hora se o APK levou as telas novas.
- Na mesma área, um botão "Ver novidades" que abre a janela "O que há de novo" quando quiser (útil se ela foi fechada sem querer).

### 3. Janela "O que há de novo" mais confiável (item 01)
- Hoje a janela só considera "já usava o app" por 2 marcas guardadas no aparelho. Vou ampliar para qualquer dado anterior do app (PIN, sessão, preferências). Assim quem atualiza vê a janela, e quem instala do zero continua sem ver.
- Se a tela de PIN ou biometria estiver aberta, a janela espera o desbloqueio para aparecer depois, e não fica escondida atrás.

### 4. Espaço do texto no modo edição com o teclado aberto (item 02)
- A altura da área de texto é calculada pela altura visível da tela. Quando o teclado abre, essa altura cai e a área fica com cerca de 3 linhas.
- Correção: guardar a altura da tela **com o teclado fechado** e manter essa altura quando o teclado abrir. A área continua ampla, a barra de ferramentas segue fixa no topo da caixa e a linha onde você digita sempre fica visível.
- No modo edição, a moldura do esboço volta exatamente ao comportamento anterior. A mudança feita para a pílula de tempo continua só nos modos esboço e tela cheia.
- Os avisos acima do texto ("Os tópicos somam X min…" e "Recuperar rascunho") ficam ocultos enquanto o teclado está aberto, para não roubar linhas.

## O que você faz depois
1. Rodar `npm run android:copy` (ou `npm run android:release:apk`).
2. Gerar o APK no Android Studio como de costume.
3. Em Configurações, conferir "Telas: 5.0.2" com a data de hoje.

## Detalhes técnicos
- `scripts/build-app-shell.mjs`: grava `dist-app/build-info.json` com `{ version, builtAt }` (versão lida do package.json) e injeta a versão e a data no código das telas por `define` do Vite (`__APP_BUILD_TIME__`).
- Novo `scripts/check-shell-fresh.mjs`: compara `dist-app/build-info.json` com a versão do package.json e com a data do arquivo mais recente em `src/`. Se não bater, encerra com erro. Novo script `android:copy` = `app:package && check && cap copy android && cap update android`.
- `src/lib/whats-new.ts`: nova função pura `hasPreviousUse(keys)` (qualquer chave `visita-sc:` além da própria marca da janela). O teste existente ganha casos: instalação nova não mostra, atualização mostra, já vista não mostra.
- `WhatsNewDialog`: exportar uma forma de abrir pela tela de Configurações; esperar o desbloqueio do PIN antes de abrir.
- `_app.consideracoes-campo.tsx`: o Card usa `overflow-hidden` quando está em modo edição e `overflow-clip` nos outros modos. A altura do editor no modo recolhido passa a usar um valor fixo em px, medido com o teclado fechado (`useStableViewportHeight`, baseado em `use-virtual-keyboard.ts`) e descontando a barra de anexos, como hoje.
- `TopicTimeSumNotice` e a faixa do `NoteDraftGuard` ficam ocultos quando `useVirtualKeyboardVisible()` é verdadeiro. A gravação automática do rascunho continua igual.
- Sem mudança no banco, no login, no PIN, na biometria ou no formato dos esboços. Validação: `bunx tsgo --noEmit` e `bunx vitest run`, mais um teste no navegador com tela de celular, simulando o teclado ao reduzir a altura.
