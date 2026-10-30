# Plano 5.0.8 — Tela inteira no painel, salvar/exportar estável e modo tela cheia

## (01) As margens foram ajustadas em todo o app?

Não. Na 5.0.7 o ajuste entrou só nas telas cheias: leitura da Bíblia, editor da esposa, tela cheia do esboço e anotação de campo. O painel do superintendente e as outras telas internas não mudaram e ainda têm:
- 16 px de margem nas laterais e no topo;
- um espaço vazio de cerca de 96 px no fim da página. Ele foi feito para uma barra inferior que não existe mais;
- o espaço da barra do celular somado a esse vazio.

O que vou mudar, seguindo o padrão do iOS e da One UI:
- Laterais de 12 px em celulares estreitos (até 400 px, como o A72) e de 16 px nos maiores. A One UI usa cerca de 12 dp entre os cartões e a borda. O iOS usa 16 pt.
- Os cartões ficam a 10–12 px um do outro, com cantos bem arredondados (cerca de 20–24 px), como na One UI 6/7.
- O espaço no fim da página passa a ser só a altura da barra do celular mais 12 px. Isso segue o iOS e a One UI: o conteúdo rola por baixo da barra de gestos.
- O cabeçalho encolhe ao rolar a página para baixo e volta ao rolar para cima, como o título grande do iOS e a área de leitura da One UI. Ele nunca sai da tela. Isso libera mais ou menos 56 px durante a leitura do painel.
- Tablet e computador ficam como estão.

```text
 ANTES (A72)                    DEPOIS (A72)
+---------------------------+  +---------------------------+
| 12:30          ▂▄▆ 87%    |  | 12:30          ▂▄▆ 87%    |
|[≡] Visita SC        [🔔]  |  |[≡] Visita SC        [🔔]  |
|                           |  | Agenda Esboços Visita ... |
|   Agenda Esboços Visita   |  |+-------------------------+|
|  +---------------------+  |  ||  Próxima visita         ||
|  |  Próxima visita     |  |  ||  Congregação Centro     ||
|  |  Congregação Centro |  |  |+-------------------------+|
|  +---------------------+  |  |+-------------------------+|
|  +---------------------+  |  ||  Hoje                   ||
|  |  Hoje               |  |  ||  Reunião 19:30          ||
|  +---------------------+  |  |+-------------------------+|
|                           |  |+-------------------------+|
|      (vazio ~96px)        |  ||  Recados / Pastoreio    ||
|                           |  |+-------------------------+|
|   ◁      ○      □         |  |   ◁      ○      □         |
+---------------------------+  +---------------------------+
  margens 16px + vazio            margens 12px, sem vazio
```

## (02) Erro ao salvar, exportar e importar

**A. "Erro" ao salvar no editor da aba Esboços (o caso que você viu)**

O que encontrei: o Salvar primeiro grava o esboço no aparelho e depois tenta enviá-lo para a nuvem. As duas etapas compartilham o mesmo aviso de erro. Se só o envio falhar, por exemplo com internet fraca, aparece "Erro" mesmo com o esboço já gravado. Hoje há falhas de sincronização desse tipo nos registros. A mensagem também não diz o motivo. E, se o app precisar usar a reserva interna e faltar espaço, o problema é ignorado sem aviso.

O que vou fazer:
1. Separar as etapas. Se gravou no aparelho, mostrar "Salvo". Se o envio falhar: "Salvo no aparelho. Será sincronizado quando a conexão voltar."
2. Só mostrar erro quando a gravação no aparelho falhar de fato, com o motivo claro (por exemplo, "Espaço do aparelho cheio"). O rascunho fica guardado.
3. A reserva interna passa a avisar quando faltar espaço.
4. Testes automáticos para esses dois casos.

**B. Exportar e salvar arquivos no celular**
O app instalado grava o arquivo exportado inteiro de uma vez. Arquivos grandes (backup, esboço com anexos, zip) podem passar do limite do Android. Vou gravar em partes, como os anexos já fazem. Se a pasta "Documentos/VisitaSC" falhar, uso a pasta do app. As mensagens ficam claras.

**C. Importar**
O seletor aceita arquivos que o celular marca como ".bin" e confere depois pelo nome e pelo conteúdo. Vale para backup, DOCX e .jwlibrary.

## (03) Tela cheia com barra escondida (puxar para baixo)

É o "modo imersivo" do Android. Na minha avaliação:
- **Vale a pena** nas telas de leitura e escrita: leitura da Bíblia, tela cheia do esboço, editor da esposa e cronômetro da visita. Ganha cerca de 60 a 90 px e tira as distrações. O Kindle, o JW Library e o Samsung Notes fazem assim.
- **Não vale a pena** no painel e nos formulários. Lá a pessoa precisa ver a hora, a bateria e os avisos com frequência.

Como funcionaria nessas telas:

```text
 LEITURA - modo imersivo         ao puxar do topo
+---------------------------+  +---------------------------+
| ‹  João 3   [★][✓]        |  | 12:30          ▂▄▆ 87%    |
|                           |  | ‹  João 3   [★][✓]        |
| 16 Porque Deus amou tanto |  |                           |
| o mundo que deu o seu     |  | 16 Porque Deus amou tanto |
| Filho unigênito...        |  | o mundo que deu o seu ... |
|                           |  |                           |
|        (texto)            |  |  (barras somem sozinhas   |
|                           |  |   após ~3 segundos)       |
+---------------------------+  +---------------------------+
 sem barra de status e de        a barra aparece por
 navegação do celular            cima, sem mexer no texto
```

- Ativado só nessas telas. Tudo volta ao normal ao sair delas.
- Uma opção em Configurações: "Tela cheia na leitura e no esboço" (ligada por padrão), salva só no aparelho.
- Na versão web nada muda.

## Versão e "O que há de novo" especial
Subir para 5.0.8 (próximo versionCode). As versões 5.0.5, 5.0.6 e 5.0.7 não chegaram ao site nem à Play Store. Por isso, o aviso desta vez será uma edição especial que junta tudo em grupos por assunto, sem uma lista por versão:

```text
+---------------------------+
|  ✦ Novidades da 5.0.8     |
|  Edição especial — reúne  |
|  as versões 5.0.5 a 5.0.8 |
|---------------------------|
| 🗓 Grandes Eventos        |
|  • Criar evento e partes  |
|  • Link com PIN ou link   |
|    pessoal por orador     |
|  • Importar .etim e       |
|    Circuito Manager       |
|    (.json e .csv)         |
| 📥 Importações            |
|  • Itinerário .ics / .csv |
|  • Notas do JW Library    |
| 📖 Estudo e Anotações     |
|  • Bíblia, Pesquisa e     |
|    Anotações em um lugar  |
|  • Leitura com mais tela, |
|    botões no topo e       |
|    destaque sem toques    |
|    acidentais             |
| 📱 Tela e uso diário      |
|  • Painel com mais espaço |
|  • Botões longe da barra  |
|    do celular             |
|  • Tela cheia na leitura  |
|  • Salvar esboço sem      |
|    "Erro" falso           |
| 📄 Termos de Uso          |
|  • Novo texto e aceite    |
|---------------------------|
|  ▸ Versões anteriores     |
|        [ Entendi ]        |
+---------------------------+
```

- A edição especial aparece uma vez para todos que atualizarem, inclusive para quem já viu o aviso de alguma versão entre 5.0.5 e 5.0.7.
- No histórico ("Versões anteriores"), as versões 5.0.5 a 5.0.7 saem da lista. O conteúdo delas passa a fazer parte desta edição, e a lista começa na 5.0.4.
- Os testes de versão continuam valendo: a primeira entrada é a versão atual e não há números repetidos.

## Detalhes técnicos
- `src/routes/_app.tsx`: troca `p-4 safe-bottom-extra` por `px-3 pt-3 sm:p-4` mais um novo utilitário `.safe-bottom-content` (`calc(0.75rem + inset-bottom)`). `safe-bottom-extra` fica no CSS para não quebrar outros usos.
- `src/lib/share.ts`: `saveViaCapacitor` passa a usar writeFile da primeira parte e appendFile das demais, a partir do Blob (512 KB por fatia), reaproveitando a lógica de `outline-attachments.ts`. Reserva Documents → Data. Se o Share falhar, o arquivo continua salvo. Mensagens em pt-BR.
- Seletores de importação: `accept="*/*"` com validação por extensão e conteúdo (assinatura ZIP `PK`, JSON).
- Imersivo: plugin `@capacitor-community/status-bar`/`StatusBar.hide` mais a navegação imersiva do Android por um plugin leve (ex.: `capacitor-plugin-immersive` ou uma ponte nativa mínima em `MainActivity` com `WindowInsetsControllerCompat`, `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`). Hook `useImmersive()` ligado ao `focus-chrome.ts` já existente. Preferência guardada no localStorage.
- Sem mudanças no banco de dados ou nas regras de acesso. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
