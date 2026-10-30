# Plano 5.0.8 — Tela inteira no painel, salvar/exportar estável e modo tela cheia

## (01) As margens foram ajustadas em todo o app?

Não. Na 5.0.7 o ajuste entrou só nas telas cheias: leitura da Bíblia, editor da esposa, tela cheia do esboço e anotação de campo. O painel do superintendente e as outras telas internas não mudaram e ainda têm:
- 16 px de margem nas laterais e no topo;
- um espaço vazio de cerca de 96 px no fim da página. Ele foi feito para uma barra inferior que não existe mais;
- o espaço da barra do celular somado a esse vazio.

O que vou mudar, seguindo o padrão do iOS e da One UI:
- Laterais de 12 px no celular (16 px a partir de tablet). Os cartões chegam mais perto da borda, como na One UI.
- O espaço no fim da página passa a ser só a altura da barra do celular mais 12 px.
- O cabeçalho continua igual. Ele já se afasta só o necessário da barra de status.
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

O que encontrei: no app instalado, o "Salvar/Exportar" grava o arquivo inteiro de uma só vez no celular. Arquivos grandes, como um backup completo, um esboço com anexos ou um zip de pasta, passam do limite de envio entre o app e o Android e dão erro. Os anexos já foram corrigidos com gravação em partes. Essa rotina geral ficou de fora.

O que vou fazer:
1. Gravar o arquivo exportado em partes, do mesmo jeito que os anexos já fazem.
2. Primeiro tentar a pasta "Documentos/VisitaSC". Se ela falhar, usar a pasta do app. Se o compartilhamento não abrir, mostrar "Arquivo salvo em ..." em vez de um erro.
3. Trocar a mensagem técnica por uma clara: "Não foi possível salvar. Tente novamente ou escolha Compartilhar."
4. Importar: o seletor passa a aceitar arquivos que o celular marca como ".bin", conferindo depois pelo nome e pelo conteúdo, como já foi feito nos Grandes Eventos. Vale para backup, DOCX e .jwlibrary.
5. Testes automáticos para a gravação em partes e para o caminho de reserva.

Ainda não sei: qual mensagem apareceu e em qual tela. Se puder, envie uma foto do erro. Assim confirmo que é este problema e não outro.

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

## Versão
Subir para 5.0.8 (versionCode 37 ou o próximo número), com as novidades dessa versão no "O que há de novo".

## Detalhes técnicos
- `src/routes/_app.tsx`: troca `p-4 safe-bottom-extra` por `px-3 pt-3 sm:p-4` mais um novo utilitário `.safe-bottom-content` (`calc(0.75rem + inset-bottom)`). `safe-bottom-extra` fica no CSS para não quebrar outros usos.
- `src/lib/share.ts`: `saveViaCapacitor` passa a usar writeFile da primeira parte e appendFile das demais, a partir do Blob (512 KB por fatia), reaproveitando a lógica de `outline-attachments.ts`. Reserva Documents → Data. Se o Share falhar, o arquivo continua salvo. Mensagens em pt-BR.
- Seletores de importação: `accept="*/*"` com validação por extensão e conteúdo (assinatura ZIP `PK`, JSON).
- Imersivo: plugin `@capacitor-community/status-bar`/`StatusBar.hide` mais a navegação imersiva do Android por um plugin leve (ex.: `capacitor-plugin-immersive` ou uma ponte nativa mínima em `MainActivity` com `WindowInsetsControllerCompat`, `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`). Hook `useImmersive()` ligado ao `focus-chrome.ts` já existente. Preferência guardada no localStorage.
- Sem mudanças no banco de dados ou nas regras de acesso. Validar com `bunx tsgo --noEmit` e `bunx vitest run`.
